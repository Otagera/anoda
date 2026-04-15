const prisma =
	require("../../../../../packages/config/src/db.config.ts").default;
const path = require("node:path");
const fs = require("node:fs/promises");
const sharp = require("sharp");
const {
	logUsage,
} = require("../../../../../packages/models/src/usage.model.ts");
const { queueServices } = require("../queue.service.ts");
const {
	storage,
} = require("../../../../../packages/utils/src/storage.util.ts");
const config =
	require("../../../../../packages/config/src/index.config.ts").default;

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
			`Processing image optimization for: ${imagePath || storageKey}`,
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
		if (!isLocal && storageProviderInstance) {
			const key = image.storage_key || storageKey;
			console.log(`Fetching image from ${image.storage_provider}: ${key}`);
			try {
				imageBuffer = await storageProviderInstance.getObject(key);
			} catch (e) {
				if (
					e.name === "NoSuchKey" ||
					e.code === "NoSuchKey" ||
					e.message.includes("NoSuchKey") ||
					e.name === "NotFound" ||
					e.code === "NotFound"
				) {
					console.warn(
						`[Image Optimization] File not found in ${image.storage_provider} as ${key}. Falling back to local file ${imagePath}.`,
					);
					imageBuffer = await fs.readFile(imagePath);
				} else {
					throw e;
				}
			}
		} else {
			imageBuffer = await fs.readFile(imagePath);
		}

		const baseName = path.basename(
			imagePath || storageKey,
			path.extname(imagePath || storageKey),
		);
		const optimizedFilename = `${baseName}_optimized.webp`;
		const tempPath = `/tmp/${optimizedFilename}`;

		await sharp(imageBuffer)
			.rotate() // Bake EXIF orientation before resizing
			.resize({ width: 2000, withoutEnlargement: true })
			.webp({ quality: 80 })
			.toFile(tempPath);

		let optimizedPathOrKey;
		if (!isLocal && storageProviderInstance) {
			console.log(`Uploading optimized image to ${image.storage_provider}`);
			const optimizedBuffer = await fs.readFile(tempPath);
			const optimizedKey = `optimized/${optimizedFilename}`;
			await storageProviderInstance.upload(optimizedBuffer, {
				key: optimizedKey,
				contentType: "image/webp",
			});
			await fs.unlink(tempPath);
			optimizedPathOrKey = optimizedKey;

			if (image.uploaded_by) {
				await logUsage(
					image.uploaded_by,
					"storage",
					"optimize",
					optimizedBuffer.length,
				);
			}
		} else {
			const optimizedLocalPath = path.join(
				path.dirname(imagePath),
				optimizedFilename,
			);
			await fs.rename(tempPath, optimizedLocalPath);
			optimizedPathOrKey = optimizedLocalPath;

			if (image.uploaded_by) {
				const size = (await fs.stat(optimizedLocalPath)).size;
				await logUsage(image.uploaded_by, "storage", "optimize", size);
			}
		}

		const imageUpdateData = { optimized_path: optimizedPathOrKey };
		// DO NOT overwrite storage_key here! storage_key must point to the original high-res image
		// so that the AI service (and future workers) process the correct original file.

		const updatedImage = await prisma.images.update({
			where: { image_id: imageId },
			data: imageUpdateData,
		});

		console.log(`Optimized image saved: ${optimizedPathOrKey}`);

		await queueServices.faceRecognitionQueueLib.addJob(
			"faceRecognition",
			{
				imageId,
				imagePath,
				storageProvider: image.storage_provider,
				storageKey: image.storage_key,
				albumId,
				worker: "faceRecognition",
			},
			{ removeOnComplete: { count: 100 }, removeOnFail: { count: 100 } },
		);
		console.log(`Queued face recognition for: ${imagePath || storageKey}`);

		return {
			status: "success",
			message: `Image optimization completed for ${imagePath || storageKey}`,
		};
	} catch (error) {
		console.error("Error processing image optimization task:", error);
		throw error;
	}
};

module.exports = run;
