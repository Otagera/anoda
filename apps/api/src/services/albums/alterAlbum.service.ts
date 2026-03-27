import joi from "joi";
import {
	aliaserSpec,
	validateSpec,
} from "../../../../../packages/utils/src/specValidator.util.ts";
import { getAlbum, updateAlbum } from "./albums.lib";

const spec = joi.object({
	album_name: joi.string(),
	album_id: joi.string().required(),
	created_by: joi.string().required(),
	share_token: joi.string().allow(null),
	storage_config_id: joi.string().uuid().allow(null),
	settings: joi
		.object({
			is_event: joi.boolean(),
			requires_approval: joi.boolean(),
			tagging_policy: joi.string().valid("HOST_ONLY", "GUESTS_SELF", "ANYONE"),
			expires_at: joi.date().allow(null),
			allow_guest_uploads: joi.boolean(),
		})
		.optional(),
});

const aliasSpec = {
	request: {
		albumName: "album_name",
		albumId: "album_id",
		userId: "created_by",
		shareToken: "share_token",
		storageConfigId: "storage_config_id",
		settings: "settings",
	},
	response: {
		album_id: "id",
		album_name: "albumName",
		created_by: "userId",
		storage_config_id: "storageConfigId",
		creation_date: "createdAt",
		shared_link: "sharedLink",
		share_token: "shareToken",
		settings: "settings",
	},
};

const service = async (data) => {
	const aliasReq = aliaserSpec(aliasSpec.request, data);
	const { album_id, created_by, ...updateData } = validateSpec(spec, aliasReq);

	await getAlbum({ album_id, created_by });

	// Filter out undefined values to prevent Prisma from trying to update them
	const cleanUpdateData = Object.fromEntries(
		Object.entries(updateData).filter(([_, v]) => v !== undefined),
	);

	const alteredAlbum = await updateAlbum(album_id, created_by, cleanUpdateData);

	const aliasRes = aliaserSpec(aliasSpec.response, alteredAlbum);
	return aliasRes;
};

export const alterAlbumService = service;
