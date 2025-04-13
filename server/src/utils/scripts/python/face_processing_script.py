import sys
import os
import face_recognition
import numpy as np
import psycopg2
import json
from dotenv import load_dotenv
import uuid

load_dotenv()  # Load .env variables

DB_HOST = os.environ.get('PG_HOSTNAME')
DB_NAME = os.environ.get('PG_DATABASE')
DB_USER = os.environ.get('PG_USERNAME')
DB_PASSWORD = os.environ.get('PG_PASSWORD')

if not all([DB_HOST, DB_NAME, DB_USER]):
    raise EnvironmentError("Database environment variables are not fully set in .env file.")

def is_valid_uuid(value):
    try:
        uuid.UUID(value)
        return True
    except ValueError:
        return False

if __name__ == "__main__":
    # Check if there are enough arguments (expecting pairs of image_path and image_id)
    if len(sys.argv) < 3 or (len(sys.argv) - 1) % 2 != 0:
        print("Usage: python face_processing_script.py <image_path_1> <image_id_1> [<image_path_2> <image_id_2> ...]")
        sys.exit(1)

    # Process images in pairs of (image_path, image_id)
    image_pairs = []
    for i in range(1, len(sys.argv), 2):
        image_path = sys.argv[i]
        image_id = sys.argv[i + 1]
        if not is_valid_uuid(image_id):
            print(f"Error: Image ID '{image_id}' is not a valid UUID. Skipping image path '{image_path}'.")
            continue  # Skip to the next pair if image_id is not a valid UUID
        image_pairs.append({'path': image_path, 'id': image_id})

    if not image_pairs:
        print("No valid image path and ID pairs provided. Exiting.")
        sys.exit(1)

    for image_info in image_pairs:
        image_path = image_info['path']
        image_id = image_info['id']

        print(f"Processing image: path='{image_path}', ID={image_id}")
        try:
            # Load the image
            image = face_recognition.load_image_file(image_path)

            # Detect face locations
            face_locations = face_recognition.face_locations(image)

            # Generate face embeddings
            face_encodings = face_recognition.face_encodings(image, face_locations)

            conn = None  # Initialize connection for each image processing attempt
            try:
                # Database connection (configure your PostgreSQL credentials)
                conn = psycopg2.connect(
                    user=DB_USER,
                    password=DB_PASSWORD,
                    host=DB_HOST,
                    database=DB_NAME
                )
                cursor = conn.cursor()

                if not face_encodings:  # Check if any faces were detected
                    print(f"No faces detected in image ID: {image_id}, path: {image_path}. Skipping database insertion for faces.")
                else:
                    for face_location, face_encoding in zip(face_locations, face_encodings):
                        top, right, bottom, left = face_location
                        bounding_box_json = json.dumps({"top": top, "right": right, "bottom": bottom, "left": left})
                        embedding_array = face_encoding.tolist()  # Convert numpy array to list for PostgreSQL array type

                        # Insert face data into the 'faces' table, linking to the image_id
                        insert_face_query = """
                            INSERT INTO faces (image_id, embedding, bounding_box)
                            VALUES (%s, %s, %s)
                        """
                        cursor.execute(insert_face_query, (image_id, embedding_array, bounding_box_json))

                    conn.commit()  # Save changes to database
                    print(f"Successfully processed image ID: {image_id}, path: {image_path} and stored face data.")  # Log success to stdout

            except (Exception, psycopg2.Error) as db_error:
                print(f"Database error processing image ID: {image_id}, path: {image_path}: {db_error}")  # Log DB errors to stderr

            finally:
                if conn:
                    cursor.close()
                    conn.close()

        except Exception as e:
            print(f"Error processing image ID: {image_id}, path: {image_path}: {e}")  # Log general errors to stderr

    print("Batch image processing completed.")  # Indicate end of batch processing
    sys.exit(0)  # Indicate overall success for batch processing (even if some images failed internally)