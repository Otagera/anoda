const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const { spawn } = require("child_process");
const dotenv = require("dotenv");
const { MulterError } = require("multer");

const logger = require("@utils/logger.util");
const router = require("@routes/index.route");
const upload = require("@routes/middleware/multer.middleware");
const limiter = require("@utils/rateLimiter.util");
const config = require("@config/index.config");
const { HTTP_STATUS_CODES } = require("@utils/constants.util");

dotenv.config();
const app = express();

app.use(cors());
app.use(logger.httpLoggerInstance);
app.use(bodyParser.json());
app.use((req, res, next) => {
  if (config.env === "test" || "development") {
    next();
  } else {
    limiter(req, res, next);
  }
});
app.use(bodyParser.urlencoded({ extended: true }));

app.set("base", "/api/v1");
app.use("/api/v1", router);

app.use("/api/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/", (req, res) => {
  res.send("Face Search Backend is running!");
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
      "./scripts/generate_search_embedding.py", // Create a separate Python script for generating search embedding
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

app.use(function (err, req, res, next) {
  if (err instanceof MulterError) {
    return res.status(HTTP_STATUS_CODES.FILE_SIZE_TOO_LARGE).send({
      status: "error",
      message: "File size too large max 5MB",
      data: err,
    });
  }
  logger.error(
    {
      msg: err.stack,
    },
    "INTERNAL_SERVER_ERROR"
  );
  return res.status(HTTP_STATUS_CODES.SERVER_ERROR).send({
    status: "error",
    message: "Internal server error",
    data: null,
  });
});

app.use(function (req, res, next) {
  return res.status(HTTP_STATUS_CODES.NOTFOUND).send({
    status: "error",
    message: "Resource not found",
    data: null,
  });
});

module.exports = { app };
