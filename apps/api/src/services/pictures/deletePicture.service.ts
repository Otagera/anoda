import Joi from "joi";
import {
	aliaserSpec,
	validateSpec,
} from "../../../../../packages/utils/src/specValidator.util.ts";
import { removeImage } from "./pictures.lib.ts";

const spec = Joi.object({
	image_id: Joi.string().required(),
	uploaded_by: Joi.string().required(),
});

const aliasSpec = {
	request: {
		imageId: "image_id",
		userId: "uploaded_by",
	},
	response: {
		image_id: "imageId",
		faces: "faces",
		image_path: "imagePath",
		upload_date: "uploadDate",
		update_date: "updateDate",
		original_size: "originalSize",
		uploaded_by: "userId",
	},
};

const service = async (data) => {
	const aliasReq = aliaserSpec(aliasSpec.request, data);
	const params = validateSpec(spec, aliasReq);

	await removeImage(params);

	const aliasRes = aliaserSpec(aliasSpec.response, {
		image_id: params.image_id,
		uploaded_by: params.uploaded_by,
	});
	return aliasRes;
};

export default service;
