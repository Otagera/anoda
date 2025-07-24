const { searchSimilarFaces } = require("@models/faces.model");

const findSimilarFaces = async (faceId, albumId, threshold, limit) => {
  return await searchSimilarFaces(faceId, albumId, threshold, limit);
};

module.exports = {
  findSimilarFaces,
};
