const { spawn } = require("child_process");
const prisma = require("../../../../../packages/config/src/db.config.ts").default;
const path = require("path");
const config = require("../../../../../packages/config/src/index.config.ts").default;

const run = async (jobData) => {
	const { imageId, imagePath } = jobData;

	try {
		console.log(`Processing image: ${imagePath} for face recognition.`);

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
