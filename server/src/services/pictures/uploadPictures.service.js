const Joi = require("joi");
const path = require("path");
const { spawn } = require("child_process");

const { validateSpec, aliaserSpec } = require("@utils/specValidator.util");
const config = require("@config/index.config");
const pool = require("@config/db.config");
const { fetchImagesByIdsQuery } = require("@models/images.model");
const { getImageSize, normalizeImagePath } = require("@utils/image.util");

const fileSchema = Joi.object({
  fieldname: Joi.string().valid("uploadedImages").required(),
  originalname: Joi.string().required(),
  encoding: Joi.string().required(),
  mimetype: Joi.string()
    .valid("image/jpeg", "image/png", "image/gif")
    .required(),
  destination: Joi.string().required(),
  filename: Joi.string().required(),
  path: Joi.string().required(),
  size: Joi.number()
    .max(5 * 1024 * 1024)
    .required(), // 5MB limit
});

const spec = Joi.object({
  files: Joi.array().items(fileSchema).min(1).max(10).required(),
});

const aliasSpec = {
  request: {
    files: "files",
  },
  response: {},
};

const storeImage = async (filename) => {
  const imagePath = path.join(__dirname, "..", "uploads", filename);
  const imageSize = await getImageSize(imagePath);

  try {
    const insertImageQuery =
      "INSERT INTO images (image_path, original_size) VALUES ($1, $2) RETURNING image_id";
    const imageResult = await pool.query(insertImageQuery, [
      imagePath,
      imageSize,
    ]);
    const imageId = imageResult.rows[0].image_id;

    return { imagePath, imageId: imageId.toString() };
  } catch (error) {
    console.error("[storeImage] Error:", error);
    throw error;
  }
};

const runPythonScript = async (scriptArgs) => {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn(
      config[config.env].python_interpreter_path,
      scriptArgs
    );

    let stdoutData = "Python script stdout: ";
    let stderrData = "";

    pythonProcess.stdout.on("data", (data) => {
      stdoutData += data.toString();
    });

    pythonProcess.stderr.on("data", (data) => {
      stderrData += data.toString();
    });

    pythonProcess.on("close", (code) => {
      if (code === 0) {
        resolve(stdoutData.trim()); // Resolve with stdout
      } else {
        reject(
          new Error(
            `Python script failed with code ${code}: stderr: ${stderrData.trim()}`
          )
        );
      }
    });

    pythonProcess.on("error", (err) => {
      reject(err); // Handle process spawn errors
    });
  });
};

const service = async (data) => {
  const aliasReq = aliaserSpec(aliasSpec.request, data);
  const params = validateSpec(spec, aliasReq);

  const imagesToProcess = [];

  for (const file of params.files) {
    imagesToProcess.push(await storeImage(file.filename));
  }

  const pythonScriptArgs = [
    path.join("src", "utils", "scripts", "python", "face_processing_script.py"),
  ];

  for (const imageInfo of imagesToProcess) {
    pythonScriptArgs.push(imageInfo.imagePath); // Add image path
    pythonScriptArgs.push(imageInfo.imageId.toString()); // Add image ID as string
  }

  await runPythonScript(pythonScriptArgs);
  const imageIds = imagesToProcess.map((img) => {
    return img.imageId;
  });

  const { rows } = await fetchImagesByIdsQuery(imageIds);

  const aliasRes = aliaserSpec(aliasSpec.response, normalizeImagePath(rows));
  return aliasRes;
};

module.exports = service;
