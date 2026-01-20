import Joi from "joi";
import {
	fetchFaceById,
	searchFaces,
} from "../../../../../packages/models/src/faces.model.ts";
import { NotFoundError } from "../../../../../packages/utils/src/error.util.ts";
import { normalizeImagePath } from "../../../../../packages/utils/src/image.util.ts";
import {
	aliaserSpec,
	validateSpec,
} from "../../../../../packages/utils/src/specValidator.util.ts";

const spec = Joi.object({
	faceId: Joi.number().required(),
	albumId: Joi.string().uuid(),
	threshold: Joi.number().min(0).max(1),
	limit: Joi.number().integer().min(1).max(100),
});

const aliasSpec = {
	request: {
		faceId: "faceId",
		albumId: "albumId",
		threshold: "threshold",
		limit: "limit",
	},
	response: {
		faces: "faces",
	},
};

const service = async (data) => {
	const aliasReq = aliaserSpec(aliasSpec.request, data);
	const params = validateSpec(spec, aliasReq);

	const face = await fetchFaceById(params.faceId);
	if (!face) {
		throw new NotFoundError("Face not found.");
	}

	const similarFaces = await searchFaces({
		faceId: params.faceId,
		albumId: params.albumId,
		threshold: params.threshold,
		limit: params.limit,
	});

	const aliasRes = aliaserSpec(aliasSpec.response, {
		faces: similarFaces.map((face) => ({
			...face,
			imagePath: normalizeImagePath(face.imagePath),
		})),
	});

	return aliasRes;
};

export default service;
