# generate_search_embedding.py
import sys
import face_recognition
import json
import numpy as np

if __name__ == "__main__":
    search_image_path = sys.argv[1]

    try:
        search_image = face_recognition.load_image_file(search_image_path)
        face_locations = face_recognition.face_locations(search_image)
        face_encodings = face_recognition.face_encodings(search_image, face_locations)

        if not face_encodings:
            print(json.dumps([])) # Output empty array if no face found
            sys.exit(0) # Exit successfully, but indicate no face found implicitly

        # For simplicity, let's assume we're only interested in the first detected face for search.
        search_embedding = face_encodings[0].tolist() # Convert numpy array to list for JSON serialization
        print(json.dumps(search_embedding)) # Output the embedding as JSON to stdout

    except Exception as e:
        print(f"Error generating search embedding: {e}") # Log errors to stderr
        sys.exit(1) # Indicate failure