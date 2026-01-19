import { Elysia, t } from "elysia";
import {
	HTTP_STATUS_CODES,
	MAXIMUM_IMAGES_CAN_UPLOAD,
} from "../../../../packages/utils/src/constants.util.ts";
import { uploadPicturesService } from "../services/pictures/uploadPictures.service.ts";
import { authPlugin } from "./middleware/auth.plugin.ts";

const picturesRoutes = new Elysia({ prefix: "/images" })
	.use(authPlugin)
	.post(
		"/",
		async ({ body, set, userId }) => {
			try {
				const files = body.uploadedImages; // Assuming 'uploadedImages' is the field name for files

				if (!files || files.length === 0) {
					set.status = HTTP_STATUS_CODES.BAD_REQUEST;
					return {
						status: "error",
						message: "No files uploaded.",
						data: null,
					};
				}

				// Convert Bun's File object to something uploadPicturesService expects
				const convertedFiles = await Promise.all(
					(Array.isArray(files) ? files : [files]).map(async (file) => ({
						buffer: await file.arrayBuffer(),
						mimetype: file.type,
						originalname: file.name,
					})),
				);

				const data = await uploadPicturesService({
					userId: userId,
					files: convertedFiles,
				});

				set.status = HTTP_STATUS_CODES.CREATED;
				return {
					status: "completed",
					message: "Image uploaded and face processing initiated.",
					data,
				};
			} catch (error: unknown) {
				const err = error as any;
				set.status = err?.statusCode || HTTP_STATUS_CODES.BAD_REQUEST;
				return {
					status: "error",
					message: err?.message || "Internal server error",
					data: null,
				};
			}
		},
		{
			body: t.Object({
				uploadedImages: t.Files({
					// Elysia's built-in file validation
					maxItems: MAXIMUM_IMAGES_CAN_UPLOAD,
					minItems: 1,
				}),
			}),
		},
	);

export default picturesRoutes;
