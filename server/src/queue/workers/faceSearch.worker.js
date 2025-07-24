const { spawn } = require("child_process");
const prisma = require("@config/db.config");
const path = require("path");
const faceSearchService = require("@services/pictures/faceSearch.service");

const run = async (jobData) => {
  const { faceId, albumId } = jobData;

  try {
    console.log(`Searching for similar faces to faceId: ${faceId} in album: ${albumId}`);

    const searchResults = await faceSearchService.searchSimilarFaces(faceId, albumId);

    return { status: "success", message: `Face search completed for faceId: ${faceId}`, results: searchResults };
  } catch (error) {
    console.error("Error processing face search task:", error);
    throw error;
  }
};

module.exports = run;
