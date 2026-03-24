const prisma =
	require("../../../../../packages/config/src/db.config.ts").default;
const path = require("node:path");
const sharp = require("sharp");
const { queueServices } = require("../queue.service.ts");

const run = async (jobData) => {
	const { imageId, imagePath, albumId } = jobData;

	try {
		console.log(`Processing image optimization for: ${imagePath}`);

		// 1. Generate Optimized WebP Version
		const optimizedFilename = `${path.basename(imagePath, path.extname(imagePath))}_optimized.webp`;
		const optimizedPath = path.join(path.dirname(imagePath), optimizedFilename);

		await sharp(imagePath)
			.resize({ width: 2000, withoutEnlargement: true })
			.webp({ quality: 80 })
			.toFile(optimizedPath);

		// 2. Update Database with Optimized Path
		await prisma.images.update({
			where: { image_id: imageId },
			data: { optimized_path: optimizedPath },
		});

		console.log(`Optimized image saved: ${optimizedPath}`);

		// 3. Queue Face Recognition
		await queueServices.faceRecognitionQueueLib.addJob(
			"faceRecognition",
			{
				imageId,
				imagePath,
				albumId,
				worker: "faceRecognition",
			},
			{ removeOnComplete: true, removeOnFail: true },
		);
		console.log(`Queued face recognition for: ${imagePath}`);

		return {
			status: "success",
			message: `Image optimization completed for ${imagePath}`,
		};
	} catch (error) {
		console.error("Error processing image optimization task:", error);
		throw error;
	}
};

module.exports = run;
