const sharp = require("sharp");
const config = require("@config/index.config");

const getImageSize = async (imagePath) => {
  const metadata = await sharp(imagePath).metadata();
  return { width: metadata.width, height: metadata.height };
};

const isImageCorrupted = async (imagePath) => {
  try {
    await sharp(imagePath).metadata();
    return false;
  } catch (error) {
    return true;
  }
};

const normalizeImagePath = (image_path) => {
  if (config.env === "test" || "development") {
    const imagePathSplit = image_path.split("/");
    const strucImagePath = image_path
      ? `http://localhost:${config[config.env].port}/api/uploads/${
          imagePathSplit[imagePathSplit.length - 1]
        }`
      : image_path;
    return strucImagePath;
  } else {
    return image_path;
  }
};

module.exports = {
  getImageSize,
  isImageCorrupted,
  normalizeImagePath,
};
