const Joi = require("joi");
const path = require("path");
const { spawn } = require("child_process");

const { validateSpec, aliaserSpec } = require("@utils/specValidator.util");
const config = require("@config/index.config");
const {
  getImageSize,
  normalizeImagePath,
  isImageCorrupted,
} = require("@utils/image.util");
const { createImages, getImagesByIds, createImage } = require("./pictures.lib");

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
  uploaded_by: Joi.string().required(),
  files: Joi.array().items(fileSchema).min(1).max(10).required(),
});

const aliasSpec = {
  request: {
    files: "files",
    userId: "uploaded_by",
  },
  response: {
    images: "images",
  },
  image: {
    image_id: "imageId",
    faces: "faces",
    image_path: "imagePath",
    upload_date: "uploadDate",
    original_size: "originalSize",
    uploaded_by: "userId",
  },
};

const storeImage = async (filename, uploaded_by) => {
  const imagePath = path.join(__dirname, "..", "..", "uploads", filename);
  const imageSize = await getImageSize(imagePath);
  const isCorrupted = await isImageCorrupted(imagePath);
  if (isCorrupted) {
    throw new Error(`Image: ${filename} is corrupted`);
  }
  try {
    const imageResult = await createImage({
      image_path: imagePath,
      original_height: imageSize.height,
      original_width: imageSize.width,
      uploaded_by,
    });

    const imageId = imageResult.image_id;

    return { imagePath, imageId: imageId.toString() };
  } catch (error) {
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
      reject(err);
    });
  });
};

const service = async (data) => {
  const aliasReq = aliaserSpec(aliasSpec.request, data);
  const params = validateSpec(spec, aliasReq);

  const imagesToProcess = [];
  for (const file of params.files) {
    // figure out how to use createImages inside storeImage
    imagesToProcess.push(await storeImage(file.filename, params.uploaded_by));
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

  const images = await getImagesByIds(imageIds);
  const aliasRes = aliaserSpec(aliasSpec.response, {
    images: images.map((image) => {
      return aliaserSpec(aliasSpec.image, {
        ...image,
        image_path: normalizeImagePath(image.image_path),
      });
    }),
  });
  return aliasRes;
};

module.exports = service;
