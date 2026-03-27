import Joi from "joi";
import prisma from "../../../../../packages/config/src/db.config.ts";
import {
	aliaserSpec,
	validateSpec,
} from "../../../../../packages/utils/src/specValidator.util.ts";
import { storage } from "../../../../../packages/utils/src/storage.util.ts";

const spec = Joi.object({
	userId: Joi.string().optional(),
	albumId: Joi.string().optional(),
	shareToken: Joi.string().optional(),
	fileName: Joi.string().required(),
	contentType: Joi.string().required(),
});

const aliasSpec = {
	request: {
		userId: "userId",
		albumId: "albumId",
		shareToken: "shareToken",
		fileName: "fileName",
		contentType: "contentType",
	},
	response: {
		uploadUrl: "uploadUrl",
		key: "key",
	},
};

const service = async (data: any) => {
	const params = validateSpec(spec, data);

	const key = `${Date.now()}-${params.fileName}`;
	let currentStorage = storage;

	// Use album's storage if specified (via albumId for owners or shareToken for guests)
	if (params.albumId || params.shareToken) {
		const album = await prisma.albums.findUnique({
			where: params.albumId
				? { album_id: params.albumId, created_by: params.userId }
				: { share_token: params.shareToken },
			include: { storage_config: true },
		});

		if (album?.storage_config) {
			try {
				currentStorage = storage.getProvider({
					provider: album.storage_config.provider as any,
					credentials: {
						accessKeyId: album.storage_config.access_key_id,
						secretAccessKey: album.storage_config.secret_access_key,
						bucket: album.storage_config.bucket,
						endpoint: album.storage_config.endpoint,
						region: album.storage_config.region || undefined,
					},
				}) as any;
			} catch (err) {
				console.error("Failed to get storage provider:", err);
				// Fall back to default storage
			}
		}
	}

	// For presigned URL, we need a special method in the provider
	try {
		const uploadUrl = await (currentStorage as any).getUploadPresignedUrl(
			key,
			params.contentType,
			3600,
			params.shareToken,
		);

		return aliaserSpec(aliasSpec.response, {
			uploadUrl,
			key,
		});
	} catch (err: any) {
		console.error("Presigned URL generation failed:", err);
		throw new Error(`Failed to generate upload URL: ${err.message}`);
	}
};

export const getPresignedUrlService = service;
