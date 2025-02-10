# face_processing_script.py
import sys
import os
import face_recognition
import numpy as np
import psycopg2
import json
from dotenv import load_dotenv

load_dotenv() # Load .env variables

DB_HOST = os.environ.get('PG_HOSTNAME')
DB_NAME = os.environ.get('PG_DATABASE')
DB_USER = os.environ.get('PG_USERNAME')
DB_PASSWORD = os.environ.get('PG_PASSWORD')

if not all([DB_HOST, DB_NAME, DB_USER]):
    raise EnvironmentError("Database environment variables are not fully set in .env file.")

if __name__ == "__main__":
    image_path = sys.argv[1]
    image_id = int(sys.argv[2]) # Get imageId from command-line args

    try:
        # Load the image
        image = face_recognition.load_image_file(image_path)

        # Detect face locations
        face_locations = face_recognition.face_locations(image)

        # Generate face embeddings
        face_encodings = face_recognition.face_encodings(image, face_locations)

        conn = None # Initialize connection outside try block for finally scope
        try:
            # Database connection (configure your PostgreSQL credentials)
            conn = psycopg2.connect(
                user=DB_USER,
                password=DB_PASSWORD,
                host=DB_HOST,
                database=DB_NAME
            )
            cursor = conn.cursor()

            for face_location, face_encoding in zip(face_locations, face_encodings):
                top, right, bottom, left = face_location
                bounding_box_json = json.dumps({"top": top, "right": right, "bottom": bottom, "left": left})
                embedding_array = face_encoding.tolist() # Convert numpy array to list for PostgreSQL array type

                # Insert face data into the 'faces' table, linking to the image_id
                insert_face_query = """
                    INSERT INTO faces (image_id, embedding, bounding_box)
                    VALUES (%s, %s, %s)
                """
                cursor.execute(insert_face_query, (image_id, embedding_array, bounding_box_json))

            conn.commit() # Save changes to database
            print(f"Successfully processed image ID: {image_id} and stored face data.") # Log success to stdout
        except (Exception, psycopg2.Error) as db_error:
            print(f"Database error: {db_error}") # Log DB errors to stderr
            sys.exit(1) # Indicate failure to Node.js by exiting with non-zero code
        finally:
            if conn:
                cursor.close()
                conn.close()

    except Exception as e:
        print(f"Error processing image: {e}") # Log general errors to stderr
        sys.exit(1) # Indicate failure