const { spawn } = require("child_process");
const prisma =
	require("../../../../../packages/config/src/db.config.ts").default;
const path = require("path");
const sharp = require("sharp");
const fs = require("fs").promises;
const {
	emitImageProcessed,
} = require("../../../../../packages/utils/src/events.util.ts");
const config =
	require("../../../../../packages/config/src/index.config.ts").default;

const run = async (jobData) => {
	const { imageId, imagePath, albumId } = jobData;

	try {
		console.log(
			`Processing image: ${imagePath} for optimization and face recognition.`,
		);

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

		// 3. Face Recognition (using the original image for accuracy)
		const pythonProcess = spawn(config[config.env].python_interpreter_path, [
			path.join(
				__dirname,
				"..",
				"..",
				"..",
				"..",
				"api",
				"src",
				"utils",
				"scripts",
				"python",
				"face_processing_script.py",
			),
			imagePath,
			imageId,
		]);

		let scriptOutput = "";
		let scriptErrorOutput = "";

		pythonProcess.stdout.on("data", (data) => {
			scriptOutput += data.toString();
		});

		pythonProcess.stderr.on("data", (data) => {
			scriptErrorOutput += data.toString();
		});

		await new Promise((resolve, reject) => {
			pythonProcess.on("close", async (code) => {
				if (code === 0) {
					if (scriptErrorOutput) {
						console.warn(
							`Python script warnings for ${imagePath}: ${scriptErrorOutput}`,
						);
					}
					try {
						const faceData = JSON.parse(scriptOutput);
						if (faceData.results && faceData.results.length > 0) {
							const imageResult = faceData.results[0];
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
							console.error(
								`No results found in Python script output for ${imagePath}`,
							);
						}
						console.log(`Face data saved for image: ${imagePath}`);
						emitImageProcessed(imageId, albumId);
						resolve();
					} catch (parseError) {
						console.error(
							`Failed to parse Python script output for ${imagePath}:`,
							parseError,
						);
						reject(parseError);
					}
				} else {
					console.error(
						`Python script exited with code ${code} for ${imagePath}. Stderr: ${scriptErrorOutput}`,
					);
					reject(new Error(`Python script failed for ${imagePath}`));
				}
			});
		});
		return {
			status: "success",
			message: `Face recognition completed for ${imagePath}`,
		};
	} catch (error) {
		console.error("Error processing face recognition task:", error);
		throw error;
	}
};

module.exports = run;
