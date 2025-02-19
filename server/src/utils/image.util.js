const sharp = require("sharp");
const config = require("@config/index.config");

const getImageSize = async (imagePath) => {
  const metadata = await sharp(imagePath).metadata();
  return { width: metadata.width, height: metadata.height };
};

const normalizeImagePath = (queryRows) => {
  return queryRows.map((row) => {
    if (config.env === "test" || "development") {
      const { image_path } = row;
      const imagePathSplit = image_path.split("/");
      const strucImagePath = image_path
        ? `http://localhost:${config[config.env].port}/api/uploads/${
            imagePathSplit[imagePathSplit.length - 1]
          }`
        : image_path;
      return {
        ...row,
        image_path: strucImagePath,
      };
    } else {
      return row;
    }
  });
};

module.exports = {
  getImageSize,
  normalizeImagePath,
};
