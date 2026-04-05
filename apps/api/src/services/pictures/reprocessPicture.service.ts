import { deleteFacesByImageId } from "../../../../../packages/models/src/faces.model.ts";
import { getImage } from "./pictures.lib.ts";

export const reprocessPictureService = async ({
	userId,
	imageId,
}: {
	userId: string;
	imageId: string;
}) => {
	// 1. Verify user owns the image and get the raw database record
	// The `getImage` lib handles the verification and throws NotFoundError if it fails.
	const image = await getImage({ image_id: imageId, uploaded_by: userId });

	// 2. Delete existing faces for this image
	await deleteFacesByImageId(imageId);

	// 3. Queue the face recognition job again
	// Dynamic import to avoid circular dependency
	const { queueServices } = await import(
		"../../../../worker/src/queue/queue.service.ts"
	);

	// We use the raw `image.image_path` because the worker needs the absolute file path, not the normalized URL
	await queueServices.faceRecognitionQueueLib.addJob(
		"faceRecognition",
		{
			imageId,
			imagePath: image.image_path,
			worker: "faceRecognition",
		},
		{ removeOnComplete: { count: 100 }, removeOnFail: { count: 100 } },
	);

	return true;
};
