const {
	storage,
} = require("../../../../../packages/utils/src/storage.util.ts");
const config =
	require("../../../../../packages/config/src/index.config.ts").default;
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
	const { images, albumStorageConfig } = jobData;

	if (!images || images.length === 0) {
		return { status: "success", message: "No images to delete." };
	}

	console.log(`Starting background deletion for ${images.length} files...`);

	let deletedCount = 0;
	let errorCount = 0;

	for (const image of images) {
		try {
			const { provider: storageProviderInstance, isLocal } = getStorageProvider(
				image,
				albumStorageConfig,
			);

			if (isLocal) {
				// Delete local files
				if (image.image_path) {
					await fs.unlink(image.image_path).catch((e) => {
						if (e.code !== "ENOENT") throw e;
					});
				}
				if (image.optimized_path) {
					await fs.unlink(image.optimized_path).catch((e) => {
						if (e.code !== "ENOENT") throw e;
					});
				}
			} else if (storageProviderInstance) {
				// Delete from cloud storage
				if (image.storage_key) {
					await storageProviderInstance.delete(image.storage_key);
				}
				// Also try to delete the optimized key if it exists
				if (image.optimized_path) {
					// The optimized_path column stores the cloud key when the provider is not local
					await storageProviderInstance.delete(image.optimized_path);
				}
			}

			deletedCount++;
		} catch (error) {
			console.error(`Failed to delete files for image ${image.image_id}:`, error);
			errorCount++;
		}
	}

	console.log(`Background deletion complete. Deleted: ${deletedCount}, Errors: ${errorCount}`);

	if (errorCount > 0) {
		throw new Error(`Failed to delete ${errorCount} files. Check logs for details.`);
	}

	return {
		status: "success",
		message: `Successfully deleted files for ${deletedCount} images.`,
	};
};

module.exports = run;