const prisma =
	require("../../../../../packages/config/src/db.config.ts").default;
const path = require("node:path");
const fs = require("node:fs/promises");
const sharp = require("sharp");
const {
	logUsage,
} = require("../../../../../packages/models/src/usage.model.ts");
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
		const image = await prisma.images.update({
			where: { image_id: imageId },
			data: { optimized_path: optimizedPath },
		});

		console.log(`Optimized image saved: ${optimizedPath}`);

		// 3. Log storage usage for optimized image
		if (image.uploaded_by) {
			const stats = await fs.stat(optimizedPath);
			await logUsage(image.uploaded_by, "storage", "optimize", stats.size);
		}

		// 4. Queue Face Recognition
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
