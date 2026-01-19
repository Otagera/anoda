import joi from "joi";
import {
	aliaserSpec,
	validateSpec,
} from "../../../../../packages/utils/src/specValidator.util.ts";
import { deleteAlbum, getAlbum } from "./albums.lib";

const spec = joi.object({
	album_id: joi.string().required(),
	created_by: joi.string().required(),
});

const aliasSpec = {
	request: {
		albumId: "album_id",
		userId: "created_by",
	},
	response: {
		album_id: "id",
		album_name: "albumName",
		created_by: "userId",
		creation_date: "createdAt",
		shared_link: "sharedLink",
	},
};

const service = async (data) => {
	const aliasReq = aliaserSpec(aliasSpec.request, data);
	const params = validateSpec(spec, aliasReq);

	await getAlbum(params);

	const deletedAlbum = await deleteAlbum(params.album_id, params.created_by);

	const aliasRes = aliaserSpec(aliasSpec.response, deletedAlbum);
	return aliasRes;
};

export const removeAlbumService = service;
