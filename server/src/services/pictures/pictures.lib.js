const {
  uploadImage,
  fetchImagesByIds,
  fetchImageById,
} = require("@models/images.model");

const createImages = async (imageData) => {
  if (!imageData.image_path) {
    throw new Error("Album name: image_path is required");
  }
  if (!imageData.original_size) {
    throw new Error("Creator: original_size is required");
  } else {
    if (!imageData.original_size.width) {
      throw new Error("Creator: original_size.width is required");
    }
    if (!imageData.original_size.height) {
      throw new Error("Creator: original_size.height is required");
    }
  }
  return await uploadImage(imageData);
};

const getImageById = async (where) => fetchImageById(where);
const getImagesByIds = async (where) => fetchImagesByIds(where);

module.exports = {
  createImages,
  getImageById,
  getImagesByIds,
};
