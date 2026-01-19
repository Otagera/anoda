const { findSimilarFaces } = require("../../../api/src/services/pictures/faces.lib.ts");

const run = async (jobData) => {
	const { faceId, albumId } = jobData;

	try {
		console.log(
			`Searching for similar faces to faceId: ${faceId} in album: ${albumId}`,
		);

		const searchResults = await findSimilarFaces(faceId, albumId);

		return {
			status: "success",
			message: `Face search completed for faceId: ${faceId}`,
			results: searchResults,
		};
	} catch (error) {
		console.error("Error processing face search task:", error);
		throw error;
	}
};

module.exports = run;
