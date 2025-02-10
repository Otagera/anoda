const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { Pool } = require("pg"); // PostgreSQL client
const path = require("path"); // Node.js path module
const { spawn } = require("child_process"); // To execute Python script
const dotenv = require("dotenv");
const sharp = require("sharp");

const upload = require("./multer.middleware");

dotenv.config();
const app = express();
const port = process.env.PORT || 5001;
const pythonInterpreterPath = path.join(
	__dirname,
	"venv_python3",
	"bin",
	"python"
);

app.use(cors());
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
app.use("/uploads", express.static("uploads"));

// PostgreSQL database connection pool setup (configure your credentials)
const pool = new Pool({
	user: process.env.PG_USERNAME,
	host: process.env.PG_HOSTNAME,
	database: process.env.PG_DATABASE, // Choose a database name
	password: process.env.PG_PASSWORD,
	port: 5432, // Default PostgreSQL port
});

const getImageSize = async (imagePath) => {
	const metadata = await sharp(imagePath).metadata();
	return { width: metadata.width, height: metadata.height };
};

app.get("/", (req, res) => {
	res.send("Face Search Backend is running!");
});

// API endpoint for image upload (to be implemented)
app.post("/api/upload", upload.single("image"), async (req, res) => {
	// 'image' is the field name for the file in the form
	if (!req.file) {
		return res.status(400).json({ error: "No image file uploaded" });
	}

	const imagePath = path.join("uploads", req.file.filename);
	const imageSize = await getImageSize(imagePath);

	try {
		// 1. Store image metadata in database
		const insertImageQuery =
			"INSERT INTO images (image_path, original_size) VALUES ($1, $2) RETURNING image_id";
		const imageResult = await pool.query(insertImageQuery, [
			imagePath,
			imageSize,
		]);
		const imageId = imageResult.rows[0].image_id;

		// 2. Trigger Python face processing script (simple script execution for now)
		const pythonProcess = spawn(pythonInterpreterPath, [
			"face_processing_script.py", // Name of your Python script (create this in the next step)
			imagePath, // Pass the image path as an argument to the script
			imageId.toString(), // Pass the imageId as well, so Python script knows which image to link faces to
		]);

		pythonProcess.stdout.on("data", (data) => {
			console.log(`Python script stdout: ${data}`);
		});

		pythonProcess.stderr.on("data", (data) => {
			console.error(`Python script stderr: ${data}`);
		});

		pythonProcess.on("close", async (code) => {
			console.log(`Python script exited with code ${code}`);
			if (code === 0) {
				const queryResult = await pool.query(
					"SELECT bounding_box FROM faces WHERE image_id = $1",
					[imageId]
				);
				const boundingBox = queryResult.rows.length
					? queryResult.rows[0]?.bounding_box
					: [];

				res.json({
					message: "Image uploaded and face processing initiated",
					imageId: imageId,
					boundingBox,
					imageSize,
				});
			} else {
				res
					.status(500)
					.json({ error: "Face processing failed", imageId: imageId });
			}
		});
	} catch (dbError) {
		console.error("Database error:", dbError);
		res.status(500).json({ error: "Database error during image upload" });
	}
});

// API endpoint for face search (to be implemented)
app.post("/api/search", upload.single("searchFaceImage"), async (req, res) => {
	if (!req.file) {
		return res.status(400).json({ error: "No search face image uploaded" });
	}

	const searchFaceImagePath = path.join("uploads", req.file.filename); // Path to the uploaded search face image

	try {
		// 1. Generate face embedding for the search face using Python script (similar to background processing)
		const pythonProcess = spawn("python", [
			"generate_search_embedding.py", // Create a separate Python script for generating search embedding
			searchFaceImagePath,
		]);

		let searchEmbeddingOutput = "";
		pythonProcess.stdout.on("data", (data) => {
			searchEmbeddingOutput += data.toString(); // Capture stdout from Python script
		});

		pythonProcess.stderr.on("data", (data) => {
			console.error(`Python embedding script stderr: ${data}`);
		});

		pythonProcess.on("close", async (code) => {
			if (code !== 0) {
				return res
					.status(500)
					.json({ error: "Error generating search face embedding" });
			}

			try {
				// 2. Parse the search embedding (expecting a JSON string from Python script)
				const searchEmbedding = JSON.parse(searchEmbeddingOutput.trim()); // Trim whitespace and parse as JSON
				if (!Array.isArray(searchEmbedding)) {
					return res.status(500).json({
						error: "Invalid search embedding format from Python script",
					});
				}

				// 3. Search the database for similar faces
				const searchResults = await performFaceSearchInDatabase(
					searchEmbedding,
					pool
				); // Implement this function

				// 4. Return search results (list of image paths)
				res.json({ results: searchResults });
			} catch (embeddingError) {
				console.error("Error processing search embedding:", embeddingError);
				res
					.status(500)
					.json({ error: "Error processing search face embedding" });
			}
		});
	} catch (uploadError) {
		console.error("Error during search face upload:", uploadError);
		res.status(500).json({ error: "Error handling search face upload" });
	}
});

// Function to perform database search for similar faces
// async function performFaceSearchInDatabase(searchEmbedding, pool) {
// 	try {
// 		const query = `SELECT images.image_path
//                      FROM faces
//                      JOIN images ON faces.image_id = images.image_id
//                      WHERE embedding = $1::real[] < 0.6  -- Adjust similarity threshold (0.6 is an example)
//                      ORDER BY embedding = $1::real[]
//                      LIMIT 10;`; // Limit results for performance, adjust as needed. <-> is PostgreSQL's array distance operator
// 		// You might need to install a PostgreSQL extension for efficient array distance calculations for very large datasets.
// 		const results = await pool.query(query, [searchEmbedding]); // Pass searchEmbedding array
// 		return results.rows.map((row) => row.image_path); // Return just image paths for now
// 	} catch (dbSearchError) {
// 		console.error("Database search error:", dbSearchError);
// 		return []; // Return empty array on error, handle error on frontend as well
// 	}
// }
async function performFaceSearchInDatabase(faceEmbeddingArray) {
	const queryResult = await pool.query("SELECT embedding FROM faces"); // Fetch embeddings
	const facesWithDistances = queryResult.rows.map((row) => {
		const distance = calculateEuclideanDistance(
			faceEmbeddingArray,
			row.embedding
		); // Implement your distance function in JS
		return { ...row, distance };
	});
	facesWithDistances.sort((a, b) => a.distance - b.distance); // Sort by distance
	return facesWithDistances.slice(0, 5); // Get top 5 closest
}

function calculateEuclideanDistance(arr1, arr2) {
	// Example Euclidean Distance in JS
	let sum = 0;
	for (let i = 0; i < arr1.length; i++) {
		// Assumes arrays are same length
		sum += (arr1[i] - arr2[i]) ** 2;
	}
	return Math.sqrt(sum);
}

app.listen(port, () => {
	console.log(`Server listening on port ${port}`);
});
