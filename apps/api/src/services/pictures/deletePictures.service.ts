import joi from "joi";
import { deleteAllImages } from "../../../../../packages/models/src/images.model.ts";
import { normalizeImagePath } from "../../../../../packages/utils/src/image.util.ts";
import {
	aliaserSpec,
	validateSpec,
} from "../../../../../packages/utils/src/specValidator.util.ts";

const spec = joi.object({});

const aliasSpec = {
	request: {},
	response: {},
};

const service = async (data) => {
	const aliasReq = aliaserSpec(aliasSpec.request, data);
	validateSpec(spec, aliasReq);

	const result = await deleteAllImages();

	const aliasRes = aliaserSpec(aliasSpec.response, normalizeImagePath(result));
	return aliasRes;
};

export default service;
