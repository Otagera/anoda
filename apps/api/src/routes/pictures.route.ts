import path from "node:path";
import { Elysia, t } from "elysia";
import {
	HTTP_STATUS_CODES,
	MAXIMUM_IMAGES_CAN_UPLOAD,
} from "../../../../packages/utils/src/constants.util.ts";
import { authDerivation } from "./middleware/auth.plugin.ts";

import deletePictureService from "../services/pictures/deletePicture.service.ts";
import fetchFacesService from "../services/pictures/fetchFaces.service.ts";
import fetchPictureService from "../services/pictures/fetchPicture.service.ts";
import fetchPicturesService from "../services/pictures/fetchPictures.service.ts";
import { uploadPicturesService } from "../services/pictures/uploadPictures.service.ts";

const UPLOADS_DIR = path.join(import.meta.dir, "..", "uploads");

const picturesRoutes = new Elysia({ prefix: "/images" })
	.derive(authDerivation)
	.post(
		"/",
		async ({ body, set, userId }) => {
			try {
				const files = body.uploadedImages; // Assuming 'uploadedImages' is the field name for files

				if (!files || (Array.isArray(files) && files.length === 0)) {
					set.status = HTTP_STATUS_CODES.BAD_REQUEST;
					return {
						status: "error",
						message: "files is required",
						data: null,
					};
				}

				// Ensure uploads directory exists (Bun.write creates it? No, usually not recursive dirs)
				// Assuming 'src/uploads' exists as per file structure.

				const convertedFiles = await Promise.all(
					(Array.isArray(files) ? files : [files]).map(async (file) => {
						const filename = `${Date.now()}-${file.name}`;
						const destination = UPLOADS_DIR;
						const filePath = path.join(destination, filename);

						await Bun.write(filePath, file);

						return {
							mimetype: file.type,
							originalname: file.name,
							fieldname: "uploadedImages",
							encoding: "7bit",
							destination: destination,
							filename: filename,
							path: filePath,
							size: file.size,
						};
					}),
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
				console.error("Error in POST /images:", error);
				const err = error as { statusCode?: number; message?: string };
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
				uploadedImages: t.Any(), // Use Any to accept single File or Array of Files
			}),
		},
	)
	.get("/", async ({ query, set, userId }) => {
		try {
			const data = await fetchPicturesService({
				...query,
				userId,
			});

			set.status = HTTP_STATUS_CODES.OK;
			return {
				status: "completed",
				message: "Images retrieved successfully.",
				data,
			};
		} catch (error: unknown) {
			const err = error as { statusCode?: number; message?: string };
			set.status = err?.statusCode || HTTP_STATUS_CODES.BAD_REQUEST;
			return {
				status: "error",
				message: err?.message || "Internal server error",
				data: null,
			};
		}
	})
	.get(
		"/:imageId",
		async ({ params, set, userId }) => {
			try {
				const imageId = params.imageId;
				const data = await fetchPictureService({
					userId,
					imageId,
				});

				set.status = HTTP_STATUS_CODES.OK;
				return {
					status: "completed",
					message: `Image: ${imageId} retrieved successfully.`,
					data,
				};
			} catch (error: unknown) {
				const err = error as { statusCode?: number; message?: string };
				if (err?.message === "Image not found.") {
					set.status = HTTP_STATUS_CODES.NOTFOUND;
				} else {
					set.status = err?.statusCode || HTTP_STATUS_CODES.BAD_REQUEST;
				}
				return {
					status: "error",
					message: err?.message || "Internal server error",
					data: null,
				};
			}
		},
		{
			params: t.Object({
				imageId: t.String(),
			}),
		},
	)
	.delete(
		"/:imageId",
		async ({ params, set, userId }) => {
			try {
				const imageId = params.imageId;
				const data = await deletePictureService({
					userId,
					imageId,
				});

				set.status = HTTP_STATUS_CODES.OK;
				return {
					status: "completed",
					message: `Image: ${imageId} deleted successfully.`,
					data,
				};
			} catch (error: unknown) {
				const err = error as { statusCode?: number; message?: string };
				if (err?.message === "Image not found.") {
					set.status = HTTP_STATUS_CODES.NOTFOUND;
				} else {
					set.status = err?.statusCode || HTTP_STATUS_CODES.BAD_REQUEST;
				}
				return {
					status: "error",
					message: err?.message || "Internal server error",
					data: null,
				};
			}
		},
		{
			params: t.Object({
				imageId: t.String(),
			}),
		},
	)
	.get(
		"/:imageId/faces",
		async ({ params, set, userId }) => {
			try {
				const imageId = params.imageId;
				const data = await fetchFacesService({
					userId,
					imageId,
				});

				set.status = HTTP_STATUS_CODES.OK;
				return {
					status: "completed",
					message: "Faces retrieved successfully.",
					data,
				};
			} catch (error: unknown) {
				const err = error as { statusCode?: number; message?: string };
				if (err?.message === "Image not found.") {
					set.status = HTTP_STATUS_CODES.NOTFOUND;
				} else {
					set.status = err?.statusCode || HTTP_STATUS_CODES.BAD_REQUEST;
				}
				return {
					status: "error",
					message: err?.message || "Internal server error",
					data: null,
				};
			}
		},
		{
			params: t.Object({
				imageId: t.String(),
			}),
		},
	);

export default picturesRoutes;
