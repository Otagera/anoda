import Joi from "joi";
import prisma from "../../../../../packages/config/src/db.config.ts";
import {
	aliaserSpec,
	validateSpec,
} from "../../../../../packages/utils/src/specValidator.util.ts";
import { storage } from "../../../../../packages/utils/src/storage.util.ts";

const spec = Joi.object({
	userId: Joi.string().required(),
	albumId: Joi.string().optional(),
	fileName: Joi.string().required(),
	contentType: Joi.string().required(),
});

const aliasSpec = {
	request: {
		userId: "userId",
		albumId: "albumId",
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

	// Use album's storage if specified
	if (params.albumId) {
		const album = await prisma.albums.findUnique({
			where: { album_id: params.albumId, created_by: params.userId },
			include: { storage_config: true },
		});

		if (album?.storage_config) {
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
		}
	}

	// For presigned URL, we need a special method in the provider
	const uploadUrl = await (currentStorage as any).getUploadPresignedUrl(
		key,
		params.contentType,
	);

	return aliaserSpec(aliasSpec.response, {
		uploadUrl,
		key,
	});
};

export const getPresignedUrlService = service;
