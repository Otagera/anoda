const axios = require("axios");
const prisma =
	require("../../../../../packages/config/src/db.config.ts").default;
const {
	emitImageProcessed,
} = require("../../../../../packages/utils/src/events.util.ts");
const config =
	require("../../../../../packages/config/src/index.config.ts").default;

const run = async (jobData) => {
	const { imageId, imagePath, albumId } = jobData;

	try {
		console.log(`Processing face recognition for: ${imagePath} via AI Service`);

		const aiServiceUrl = config[config.env].ai_service_url;

		const response = await axios.post(`${aiServiceUrl}/process`, {
			image_path: imagePath,
			image_id: imageId,
		});

		const faceData = response.data;

		if (faceData.results && faceData.results.length > 0) {
			const imageResult = faceData.results[0];

			if (imageResult.error) {
				throw new Error(`AI Service Error: ${imageResult.error}`);
			}

			if (imageResult.faces && imageResult.faces.length > 0) {
				for (const face of imageResult.faces) {
					await prisma.faces.create({
						data: {
							image_id: imageResult.image_id,
							embedding: face.embedding,
							bounding_box: face.bounding_box,
							processed_time: new Date(),
						},
					});
				}
			} else {
				console.log(`No faces detected for image: ${imagePath}`);
			}
		} else {
			console.error(`No results found in AI Service response for ${imagePath}`);
		}

		console.log(`Face data saved for image: ${imagePath}`);
		emitImageProcessed(imageId, albumId);

		return {
			status: "success",
			message: `Face recognition completed for ${imagePath}`,
		};
	} catch (error) {
		console.error("Error processing face recognition task:", error.message);
		throw error;
	}
};

module.exports = run;
