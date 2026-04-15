const axios = require("axios");
const path = require("node:path");
const prisma =
	require("../../../../../packages/config/src/db.config.ts").default;
const {
	emitImageProcessed,
} = require("../../../../../packages/utils/src/events.util.ts");
const config =
	require("../../../../../packages/config/src/index.config.ts").default;
const {
	storage,
} = require("../../../../../packages/utils/src/storage.util.ts");
const fs = require("node:fs/promises");

const getStorageProvider = (image, albumStorageConfig = null) => {
	const provider =
		image.storage_provider ||
		(albumStorageConfig ? albumStorageConfig.provider : null);

	if (!provider || provider === "local") {
		return { provider: null, isLocal: true };
	}

	let credentials = {
		accessKeyId:
			image.storage_access_key_id || albumStorageConfig?.access_key_id,
		secretAccessKey:
			image.storage_secret_access_key || albumStorageConfig?.secret_access_key,
		bucket: image.storage_bucket || albumStorageConfig?.bucket,
		endpoint: image.storage_endpoint || albumStorageConfig?.endpoint,
		region: image.storage_region || albumStorageConfig?.region,
	};

	// If credentials are missing, fall back to Managed R2 from config
	const envConfig = config[config.env || "development"];
	const r2 = envConfig?.r2;
	if (
		r2?.access_key_id &&
		r2?.secret_access_key &&
		r2?.bucket &&
		(!credentials.bucket || !credentials.endpoint)
	) {
		credentials = {
			accessKeyId: r2.access_key_id,
			secretAccessKey: r2.secret_access_key,
			bucket: r2.bucket,
			endpoint: r2.endpoint || "",
			region: r2.region || "auto",
		};
	}

	return {
		provider: storage.getProvider({
			provider,
			credentials,
			skip_tls_verify:
				provider !== "local"
					? config[config.env || "development"].skip_tls_verify
					: false,
		}),
		isLocal: false,
	};
};

const run = async (jobData) => {
	const { imageId, imagePath, storageProvider, storageKey, albumId } = jobData;

	try {
		console.log(
			`Processing face recognition for: ${imagePath || storageKey} via AI Service`,
		);

		const image = await prisma.images.findUnique({
			where: { image_id: imageId },
		});

		if (!image) {
			throw new Error(`Image not found: ${imageId}`);
		}

		let albumStorageConfig = null;
		if (albumId) {
			const albumImage = await prisma.album_images.findFirst({
				where: { image_id: imageId },
				include: { albums: { include: { storage_config: true } } },
			});
			if (albumImage?.albums?.storage_config) {
				albumStorageConfig = albumImage.albums.storage_config;
			}
		}

		const { provider: storageProviderInstance, isLocal } = getStorageProvider(
			image,
			albumStorageConfig,
		);

		let imageBuffer;
		let imagePathForAI;

		if (!isLocal && storageProviderInstance) {
			const key = image.storage_key || storageKey;
			console.log(`Fetching image from ${image.storage_provider}: ${key}`);
			try {
				imageBuffer = await storageProviderInstance.getObject(key);
				const tempPath = `/tmp/${path.basename(key)}`;
				await fs.writeFile(tempPath, imageBuffer);
				imagePathForAI = tempPath;
			} catch (e) {
				if (
					e.name === "NoSuchKey" ||
					e.code === "NoSuchKey" ||
					e.message.includes("NoSuchKey") ||
					e.name === "NotFound" ||
					e.code === "NotFound"
				) {
					console.warn(
						`[Face Recognition] File not found in ${image.storage_provider} as ${key}. Falling back to local file ${imagePath}.`,
					);
					imagePathForAI = imagePath;
					// Important: Clear storage fields so AI service uses local path
					image.storage_provider = null;
					image.storage_key = null;
				} else {
					throw e;
				}
			}
		} else {
			imagePathForAI = imagePath;
		}

		const aiServiceUrl = config[config.env].ai_service_url;

		const response = await axios.post(`${aiServiceUrl}/process`, {
			image_path: imagePathForAI,
			image_id: imageId,
			storage_provider: image.storage_provider,
			storage_key: image.storage_key,
		});

		if (!isLocal && imagePathForAI.startsWith("/tmp/")) {
			await fs.unlink(imagePathForAI);
		}

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
				console.log(`No faces detected for image: ${imagePath || storageKey}`);
			}
		} else {
			console.error(
				`No results found in AI Service response for ${imagePath || storageKey}`,
			);
		}

		console.log(`Face data saved for image: ${imagePath || storageKey}`);
		emitImageProcessed(imageId, albumId);

		return {
			status: "success",
			message: `Face recognition completed for ${imagePath || storageKey}`,
		};
	} catch (error) {
		console.error("Error processing face recognition task:", error.message);
		throw error;
	}
};

module.exports = run;
