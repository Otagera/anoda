import sys
import os
import face_recognition
import numpy as np
import json
import uuid

def is_valid_uuid(value):
    try:
        uuid.UUID(value)
        return True
    except ValueError:
        return False

if __name__ == "__main__":
    # Check if there are enough arguments (expecting pairs of image_path and image_id)
    if len(sys.argv) < 3 or (len(sys.argv) - 1) % 2 != 0:
        print("Usage: python face_processing_script.py <image_path_1> <image_id_1> [<image_path_2> <image_id_2> ...]", file=sys.stderr)
        sys.exit(1)

    # Process images in pairs of (image_path, image_id)
    image_pairs = []
    for i in range(1, len(sys.argv), 2):
        image_path = sys.argv[i]
        image_id = sys.argv[i + 1]
        if not is_valid_uuid(image_id):
            print(f"Error: Image ID '{image_id}' is not a valid UUID. Skipping image path '{image_path}'.", file=sys.stderr)
            continue  # Skip to the next pair if image_id is not a valid UUID
        image_pairs.append({'path': image_path, 'id': image_id})

    if not image_pairs:
        print("No valid image path and ID pairs provided. Exiting.", file=sys.stderr)
        sys.exit(1)

    results = []
    for image_info in image_pairs:
        image_path = image_info['path']
        image_id = image_info['id']

        print(f"Processing image: path='{image_path}', ID={image_id}", file=sys.stderr)
        try:
            # Load the image
            image = face_recognition.load_image_file(image_path)

            # Detect face locations
            face_locations = face_recognition.face_locations(image)

            # Generate face embeddings
            face_encodings = face_recognition.face_encodings(image, face_locations)

            faces_data = []
            if not face_encodings:  # Check if any faces were detected
                print(f"No faces detected in image ID: {image_id}, path: {image_path}.", file=sys.stderr)
            else:
                for face_location, face_encoding in zip(face_locations, face_encodings):
                    top, right, bottom, left = face_location
                    bounding_box = {"top": top, "right": right, "bottom": bottom, "left": left}
                    embedding = face_encoding.tolist()  # Convert numpy array to list

                    faces_data.append({
                        "embedding": embedding,
                        "bounding_box": bounding_box
                    })
                print(f"Successfully processed image ID: {image_id}, path: {image_path} and extracted face data.", file=sys.stderr)

            results.append({
                "image_id": image_id,
                "faces": faces_data
            })

        except Exception as e:
            print(f"Error processing image ID: {image_id}, path: {image_path}: {e}", file=sys.stderr)
            results.append({
                "image_id": image_id,
                "error": str(e)
            })

    print(json.dumps({"results": results}))
    sys.exit(0)