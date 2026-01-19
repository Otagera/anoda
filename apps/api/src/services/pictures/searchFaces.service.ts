import Joi from "joi";
import { normalizeImagePath } from "../../../../../packages/utils/src/image.util.ts";
import {
	aliaserSpec,
	validateSpec,
} from "../../../../../packages/utils/src/specValidator.util.ts";
import { findSimilarFaces } from "./faces.lib.ts";

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
	face: {
		face_id: "faceId",
		image_id: "imageId",
		image_path: "imagePath",
		bounding_box: "boundingBox",
		distance: "distance",
	},
};

const service = async (data) => {
	const aliasReq = aliaserSpec(aliasSpec.request, data);
	const params = validateSpec(spec, aliasReq);

	const similarFaces = await findSimilarFaces(
		params.faceId,
		params.albumId,
		params.threshold,
		params.limit,
	);

	const aliasRes = aliaserSpec(aliasSpec.response, {
		faces: similarFaces.map((face) => {
			return aliaserSpec(aliasSpec.face, {
				...face,
				image_path: normalizeImagePath(face.image_path),
			});
		}),
	});

	return aliasRes;
};

export default service;
