import Joi from "joi";
import { moderateImagesQuery } from "../../../../../packages/models/src/images.model.ts";
import {
	aliaserSpec,
	validateSpec,
} from "../../../../../packages/utils/src/specValidator.util.ts";

const spec = Joi.object({
	imageIds: Joi.array().items(Joi.string().uuid()).min(1).required(),
	status: Joi.string().valid("APPROVED", "REJECTED").required(),
});

const aliasSpec = {
	request: {
		imageIds: "imageIds",
		status: "status",
	},
	response: {
		count: "count",
	},
};

const service = async (data: any) => {
	const aliasReq = aliaserSpec(aliasSpec.request, data);
	const params = validateSpec(spec, aliasReq);

	const result = await moderateImagesQuery(params.imageIds, params.status);

	return aliaserSpec(aliasSpec.response, {
		count: result.count,
	});
};

export const moderatePicturesService = service;
