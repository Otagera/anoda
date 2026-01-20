import Joi from "joi";
import {
	aliaserSpec,
	validateSpec,
} from "../../../../../packages/utils/src/specValidator.util.ts";
import { queueServices } from "../../../../worker/src/queue/queue.service.ts";

const faceSearchSpec = Joi.object({
	faceId: Joi.string().required(),
	albumId: Joi.string().required(),
});

const aliasSpec = {
	request: {
		imageId: "image_id",
		userId: "uploaded_by",
	},
};

const faceSearchService = async (data) => {
	const faceSearchPayload = aliaserSpec(aliasSpec.request, data);
	const { faceId, albumId } = validateSpec(faceSearchSpec, faceSearchPayload);

	await queueServices.faceSearchQueueLib.addJob(
		"faceSearch",
		{ faceId, albumId, worker: "faceSearch" },
		{ removeOnComplete: true, removeOnFail: true },
	);
};

export default faceSearchService;
