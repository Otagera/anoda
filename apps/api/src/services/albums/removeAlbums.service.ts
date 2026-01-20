import joi from "joi";
import {
	aliaserSpec,
	validateSpec,
} from "../../../../../packages/utils/src/specValidator.util.ts";
import { deleteAlbums } from "./albums.lib";

const spec = joi.object({
	created_by: joi.string().required(),
});

const aliasSpec = {
	request: {
		userId: "created_by",
	},
	response: {},
};

const service = async (data) => {
	const aliasReq = aliaserSpec(aliasSpec.request, data);
	const params = validateSpec(spec, aliasReq);

	await deleteAlbums(params.created_by);

	return {};
};

export const removeAlbumsService = service;
