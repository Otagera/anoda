import Joi from "joi";
import {
	aliaserSpec,
	validateSpec,
} from "../../../../../packages/utils/src/specValidator.util.ts";
import { fetchFaceById, updateFacePerson } from "../../../../../packages/models/src/faces.model.ts";
import { NotFoundError } from "../../../../../packages/utils/src/error.util.ts";

const spec = Joi.object({
	faceId: Joi.number().required(),
	personId: Joi.string().uuid().allow(null),
});

const aliasSpec = {
	request: {
		faceId: "faceId",
		personId: "personId",
	},
	response: {
        face_id: "faceId",
        person_id: "personId",
	},
};

const service = async (data) => {
	const aliasReq = aliaserSpec(aliasSpec.request, data);
	const params = validateSpec(spec, aliasReq);

	const face = await fetchFaceById(params.faceId);
	if (!face) {
		throw new NotFoundError("Face not found.");
	}

	const updatedFace = await updateFacePerson(params.faceId, params.personId);

	return aliaserSpec(aliasSpec.response, updatedFace);
};

export default service;
