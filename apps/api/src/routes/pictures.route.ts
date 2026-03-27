import fs from "node:fs";
import path from "node:path";
import { Elysia, t } from "elysia";
import prisma from "../../../../packages/config/src/db.config.ts";
import {
	HTTP_STATUS_CODES,
	UPLOADS_DIR,
} from "../../../../packages/utils/src/constants.util.ts";
import { storage } from "../../../../packages/utils/src/storage.util.ts";
import deletePictureService from "../services/pictures/deletePicture.service.ts";
import fetchFacesService from "../services/pictures/fetchFaces.service.ts";
import fetchPictureService from "../services/pictures/fetchPicture.service.ts";
import fetchPicturesService from "../services/pictures/fetchPictures.service.ts";
import { getPresignedUrlService } from "../services/pictures/getPresignedUrl.service.ts";
import { moderatePicturesService } from "../services/pictures/moderatePictures.service.ts";
import { reprocessPictureService } from "../services/pictures/reprocessPicture.service.ts";
import { uploadPicturesService } from "../services/pictures/uploadPictures.service.ts";
import { authDerivation } from "./middleware/auth.plugin.ts";
import { checkQuota } from "./middleware/quota.middleware.ts";

const picturesRoutes = new Elysia({ prefix: "/images" })
	.derive(authDerivation)
	.post(
		"/",
		async ({ body, set, userId }) => {
			try {
				const files = body.uploadedImages;
				const albumId = body.albumId;
				const existingKey = body.key;

				if (
					!existingKey &&
					(!files || (Array.isArray(files) && files.length === 0))
				) {
					set.status = HTTP_STATUS_CODES.BAD_REQUEST;
					return {
						status: "error",
						message: "Either files or an existing key is required",
						data: null,
					};
				}

				let convertedFiles = [];

				if (existingKey) {
					// Logic for file already in storage (via presigned URL)
					const absolutePath = path.resolve(
						process.cwd(),
						UPLOADS_DIR,
						existingKey,
					);
					// construct a minimal file object for the service
					convertedFiles = [
						{
							mimetype: "image/jpeg",
							originalname: existingKey,
							fieldname: "uploadedImages",
							encoding: "7bit",
							destination: UPLOADS_DIR,
							filename: existingKey,
							path: absolutePath,
							size: 0,
						},
					];
				} else {
					// Original logic for direct file upload to API
					// Dynamic Storage Provider Selection
					let currentStorage = storage;
					if (albumId && albumId !== "undefined" && albumId !== "null") {
						const album = await prisma.albums.findUnique({
							where: { album_id: albumId, created_by: userId },
							include: { storage_config: true },
						});

						if (album?.storage_config) {
							currentStorage = storage.getProvider({
								provider: album.storage_config.provider as any,
								credentials: {
									accessKeyId: album.storage_config.access_key_id,
									secretAccessKey: album.storage_config.secret_access_key,
									bucket: album.storage_config.bucket,
									endpoint: album.storage_config.endpoint,
									region: album.storage_config.region || undefined,
								},
							}) as any;
						}
					}

					convertedFiles = await Promise.all(
						(Array.isArray(files) ? files : [files]).map(async (file) => {
							const filename = `${Date.now()}-${file.name}`;

							const fileBuffer = Buffer.from(await file.arrayBuffer());
							const storedKey = await currentStorage.upload(fileBuffer, {
								key: filename,
								contentType: file.type,
							});

							const absolutePath = path.resolve(
								process.cwd(),
								UPLOADS_DIR,
								storedKey,
							);

							return {
								mimetype: file.type,
								originalname: file.name,
								fieldname: "uploadedImages",
								encoding: "7bit",
								destination: UPLOADS_DIR,
								filename: filename,
								path: absolutePath,
								size: file.size,
							};
						}),
					);
				}

				const data = await uploadPicturesService({
					userId: userId,
					files: convertedFiles,
					status: body.status,
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
				uploadedImages: t.Optional(t.Any()),
				albumId: t.Optional(t.String()),
				key: t.Optional(t.String()),
				status: t.Optional(t.String()),
			}),
			beforeHandle: [checkQuota as any],
		},
	)
	.post(
		"/presigned-url",
		async ({ body, set, userId }) => {
			try {
				const data = await getPresignedUrlService({
					...body,
					userId,
				});

				set.status = HTTP_STATUS_CODES.OK;
				return {
					status: "completed",
					message: "Presigned URL generated successfully.",
					data,
				};
			} catch (error: any) {
				set.status = error?.statusCode || HTTP_STATUS_CODES.BAD_REQUEST;
				return {
					status: "error",
					message: error?.message || "Internal server error",
					data: null,
				};
			}
		},
		{
			body: t.Object({
				albumId: t.Optional(t.String()),
				fileName: t.String(),
				contentType: t.String(),
			}),
		},
	)
	.post(
		"/upload-direct-local",
		async ({ query, body, set }) => {
			try {
				const key = query.key;
				if (!key) throw new Error("Key is required");

				const file = body as any; // Raw binary body
				const filePath = path.join(process.cwd(), UPLOADS_DIR, key);

				await Bun.write(filePath, file);

				set.status = HTTP_STATUS_CODES.OK;
				return { success: true };
			} catch (error: any) {
				set.status = HTTP_STATUS_CODES.BAD_REQUEST;
				return { error: error.message };
			}
		},
		{
			query: t.Object({
				key: t.String(),
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
	)
	.patch(
		"/moderate",
		async ({ body, set, userId }) => {
			try {
				const data = await moderatePicturesService({
					...body,
					userId,
				});

				set.status = HTTP_STATUS_CODES.OK;
				return {
					status: "completed",
					message: "Images moderated successfully.",
					data,
				};
			} catch (error: any) {
				set.status = error?.statusCode || HTTP_STATUS_CODES.BAD_REQUEST;
				return {
					status: "error",
					message: error?.message || "Internal server error",
					data: null,
				};
			}
		},
		{
			body: t.Object({
				imageIds: t.Array(t.String()),
				status: t.String(),
			}),
		},
	);

export default picturesRoutes;
