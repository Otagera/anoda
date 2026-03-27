import Joi from "joi";
import { logUsage } from "../../../../../packages/models/src/usage.model.ts";
import {
	getImageSize,
	isImageCorrupted,
	normalizeImagePath,
} from "../../../../../packages/utils/src/image.util.ts";
import {
	aliaserSpec,
	validateSpec,
} from "../../../../../packages/utils/src/specValidator.util.ts";
import { queueServices } from "../../../../worker/src/queue/queue.service.ts";
import { createImage, getImagesByIds } from "./pictures.lib";

const fileSchema = Joi.object({
	fieldname: Joi.string().valid("uploadedImages").required(),
	originalname: Joi.string().required(),
	encoding: Joi.string().required(),
	mimetype: Joi.string()
		.valid("image/jpeg", "image/png", "image/gif", "image/webp")
		.required(),
	destination: Joi.string().required(),
	filename: Joi.string().required(),
	path: Joi.string().required(),
	size: Joi.number()
		.max(50 * 1024 * 1024)
		.required(), // 50MB limit
});

const spec = Joi.object({
	uploaded_by: Joi.string().optional(),
	status: Joi.string()
		.valid("PENDING", "APPROVED", "REJECTED")
		.default("APPROVED"),
	files: Joi.array().items(fileSchema).min(1).max(50).required(),
});

const aliasSpec = {
	request: {
		files: "files",
		userId: "uploaded_by",
		status: "status",
	},
	response: {
		images: "images",
	},
	image: {
		image_id: "imageId",
		faces: "faces",
		image_path: "imagePath",
		status: "status",
		upload_date: "uploadDate",
		update_date: "updateDate",
		original_size: "originalSize",
		uploaded_by: "userId",
	},
};

const storeImage = async (file, uploaded_by, status) => {
	const imagePath = file.path;
	const imageSize = await getImageSize(imagePath);
	const isCorrupted = await isImageCorrupted(imagePath);
	if (isCorrupted) {
		throw new Error(`Image: ${file.filename} is corrupted`);
	}

	const imageResult = await createImage({
		image_path: imagePath,
		original_height: imageSize.height,
		original_width: imageSize.width,
		uploaded_by,
		status,
	});

	const imageId = imageResult.image_id;

	return { imagePath, imageId: imageId.toString() };
};

const service = async (data) => {
	const aliasReq = aliaserSpec(aliasSpec.request, data);
	const params = validateSpec(spec, aliasReq);

	const imagesToProcess = [];
	for (const file of params.files) {
		imagesToProcess.push(
			await storeImage(file, params.uploaded_by, params.status),
		);
	}

	for (const imageInfo of imagesToProcess) {
		await queueServices.imageOptimizationQueueLib.addJob(
			"imageOptimization",
			{
				imageId: imageInfo.imageId,
				imagePath: imageInfo.imagePath,
				worker: "imageOptimization",
			},
			{ removeOnComplete: true, removeOnFail: true },
		);

		// Log usage for each image processed
		if (params.uploaded_by) {
			await logUsage(params.uploaded_by, "compute_unit", "face_detection", 1);
		}
	}
	const imageIds = imagesToProcess.map((img) => {
		return img.imageId;
	});

	const images = await getImagesByIds(imageIds);
	const aliasRes = aliaserSpec(aliasSpec.response, {
		images: images.map((image) => {
			return aliaserSpec(aliasSpec.image, {
				...image,
				image_path: normalizeImagePath(image.image_path),
			});
		}),
	});
	return aliasRes;
};

export const uploadPicturesService = service;
