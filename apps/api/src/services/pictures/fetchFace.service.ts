import Joi from "joi";
import { fetchFaceById } from "../../../../../packages/models/src/faces.model.ts";
import { NotFoundError } from "../../../../../packages/utils/src/error.util.ts";
import {
	aliaserSpec,
	validateSpec,
} from "../../../../../packages/utils/src/specValidator.util.ts";

const spec = Joi.object({
	face_id: Joi.number().required(),
	// uploaded_by: Joi.string().uuid().required(), // Optional: if we want to restrict by user
});

const aliasSpec = {
	request: {
		faceId: "face_id",
	},
	response: {
		face_id: "faceId",
		image_id: "imageId",
		embedding: "embedding",
		bounding_box: "boundingBox",
		processed_time: "processedTime",
	},
};

const service = async (data) => {
	const aliasReq = aliaserSpec(aliasSpec.request, data);
	const params = validateSpec(spec, aliasReq);

	const face = await fetchFaceById(params.face_id);

	if (!face) {
		throw new NotFoundError("Face not found.");
	}

	const aliasRes = aliaserSpec(aliasSpec.response, face);
	return aliasRes;
};

export default service;
