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
});

const aliasSpec = {
	request: {
		albumName: "album_name",
		albumId: "album_id",
		userId: "created_by",
		shareToken: "share_token",
	},
	response: {
		album_id: "id",
		album_name: "albumName",
		created_by: "userId",
		creation_date: "createdAt",
		shared_link: "sharedLink",
		share_token: "shareToken",
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

	const alteredAlbum = await updateAlbum(
		album_id,
		created_by,
		cleanUpdateData,
	);

	const aliasRes = aliaserSpec(aliasSpec.response, alteredAlbum);
	return aliasRes;
};

export const alterAlbumService = service;
