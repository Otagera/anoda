import fs from "node:fs";
import path from "node:path";
import { Elysia, t } from "elysia";
import {
	HTTP_STATUS_CODES,
	UPLOADS_DIR,
} from "../../../../packages/utils/src/constants.util.ts";
import deletePictureService from "../services/pictures/deletePicture.service.ts";
import fetchFacesService from "../services/pictures/fetchFaces.service.ts";
import fetchPictureService from "../services/pictures/fetchPicture.service.ts";
import fetchPicturesService from "../services/pictures/fetchPictures.service.ts";
import { reprocessPictureService } from "../services/pictures/reprocessPicture.service.ts";
import { uploadPicturesService } from "../services/pictures/uploadPictures.service.ts";
import { authDerivation } from "./middleware/auth.plugin.ts";

// Robustly resolve the uploads directory.
// If we are in apps/api, and UPLOADS_DIR is apps/api/src/uploads, we need to handle that.
let resolvedUploadsDir = path.resolve(process.cwd(), UPLOADS_DIR);
if (!fs.existsSync(resolvedUploadsDir) && process.cwd().endsWith("apps/api")) {
	// If we are already in apps/api, try stripping the prefix if it's there
	const alternativePath = path.resolve(
		process.cwd(),
		UPLOADS_DIR.replace("apps/api/", ""),
	);
	if (alternativePath.includes("src/uploads")) {
		resolvedUploadsDir = alternativePath;
	}
}

// Ensure the directory exists
if (!fs.existsSync(resolvedUploadsDir)) {
	fs.mkdirSync(resolvedUploadsDir, { recursive: true });
}

console.log(`Resolved uploads directory: ${resolvedUploadsDir}`);

const picturesRoutes = new Elysia({ prefix: "/images" })
	.derive(authDerivation)
	.post(
		"/",
		async ({ body, set, userId }) => {
			try {
				console.log("Upload request received. Body keys:", Object.keys(body));
				const files = body.uploadedImages;

				if (!files || (Array.isArray(files) && files.length === 0)) {
					console.error("No files found in request body");
					set.status = HTTP_STATUS_CODES.BAD_REQUEST;
					return {
						status: "error",
						message: "files is required",
						data: null,
					};
				}

				console.log(
					`Processing ${Array.isArray(files) ? files.length : 1} file(s)`,
				);

				const convertedFiles = await Promise.all(
					(Array.isArray(files) ? files : [files]).map(async (file) => {
						console.log(
							`Saving file: ${file.name}, size: ${file.size}, type: ${file.type}`,
						);
						const filename = `${Date.now()}-${file.name}`;
						const destination = resolvedUploadsDir;
						const filePath = path.join(destination, filename);

						await Bun.write(filePath, file);
						console.log(`File saved to: ${filePath}`);

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
	)
	.post(
		"/:imageId/reprocess",
		async ({ params, set, userId }) => {
			try {
				const imageId = params.imageId;
				const success = await reprocessPictureService({
					userId,
					imageId,
				});

				set.status = HTTP_STATUS_CODES.OK;
				return {
					status: "completed",
					message: "Image queued for re-processing.",
					data: { success },
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
