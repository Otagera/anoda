const {
	findSimilarFaces,
} = require("../../../api/src/services/pictures/faces.lib.ts");
const prisma =
	require("../../../../../packages/config/src/db.config.ts").default;
const {
	logUsage,
} = require("../../../../../packages/models/src/usage.model.ts");

const run = async (jobData) => {
	const { faceId, albumId } = jobData;

	try {
		console.log(
			`Searching for similar faces to faceId: ${faceId} in album: ${albumId}`,
		);

		const searchResults = await findSimilarFaces(faceId, albumId);

		// Log compute usage for face search
		if (searchResults?.length > 0) {
			// Find the user who owns this face
			const face = await prisma.faces.findUnique({
				where: { face_id: faceId },
				include: { images: true },
			});

			if (face?.images?.uploaded_by) {
				await logUsage(
					face.images.uploaded_by,
					"compute",
					"face_search",
					1, // 1 unit per search
					albumId,
					{ face_id: faceId, results_count: searchResults.length },
				);
			}
		}

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
