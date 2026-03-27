import path from "node:path";
import axios from "axios";
import { Elysia, t } from "elysia";
import prisma from "../../../../packages/config/src/db.config.ts";
import config from "../../../../packages/config/src/index.config.ts";
import { createAlbumImageLinks } from "../../../../packages/models/src/albumImages.model.ts";
import {
	searchFaces,
	searchFacesByEmbedding,
} from "../../../../packages/models/src/faces.model.ts";
import {
	HTTP_STATUS_CODES,
	UPLOADS_DIR,
} from "../../../../packages/utils/src/constants.util.ts";
import { NotFoundError } from "../../../../packages/utils/src/error.util.ts";
import { normalizeImagePath } from "../../../../packages/utils/src/image.util.ts";
import { storage } from "../../../../packages/utils/src/storage.util.ts";
import { uploadPicturesService } from "../services/pictures/uploadPictures.service.ts";
import { checkQuota } from "./middleware/quota.middleware.ts";

const publicRoutes = new Elysia({ prefix: "/public" })
	.get(
		"/albums/:token",
		async ({ params, set }) => {
			try {
				const album = await prisma.albums.findUnique({
					where: { share_token: params.token },
					include: {
						album_images: {
							include: {
								images: {
									include: {
										faces: true,
									},
								},
							},
							where: {
								images: {
									status: "APPROVED",
								},
							},
						},
						settings: true,
					},
				});

				if (!album) {
					throw new NotFoundError("Album not found or link expired.");
				}

				// Check if event is collaborative and allow guest uploads
				const isCollaborative =
					album.settings?.is_event && album.settings?.allow_guest_uploads;
				const canUpload =
					isCollaborative &&
					(!album.settings?.expires_at ||
						new Date(album.settings.expires_at) > new Date());

				// Format response to match private fetchAlbumService but without owner info
				const images = album.album_images
					.map((ai) => ai.images)
					.filter((img): img is NonNullable<typeof img> => img !== null)
					.map((img) => ({
						...img,
						imageId: img.image_id,
						imagePath: normalizeImagePath(img.image_path),
						originalSize: {
							width: img.original_width,
							height: img.original_height,
						},
					}));

				set.status = HTTP_STATUS_CODES.OK;
				return {
					status: "completed",
					message: "Shared album retrieved successfully.",
					data: {
						id: album.album_id,
						albumName: album.album_name,
						settings: album.settings,
						canUpload,
						images,
					},
				};
			} catch (error) {
				set.status = error?.statusCode || HTTP_STATUS_CODES.BAD_REQUEST;
				return {
					status: "error",
					message: error?.message || "Internal server error",
					data: null,
				};
			}
		},
		{
			params: t.Object({
				token: t.String(),
			}),
		},
	)
	.get(
		"/images/:token/:imageId",
		async ({ params, set }) => {
			try {
				// Verify the image belongs to the shared album
				const album = await prisma.albums.findUnique({
					where: { share_token: params.token },
					include: {
						album_images: {
							where: { image_id: params.imageId },
						},
					},
				});

				if (!album || album.album_images.length === 0) {
					throw new NotFoundError("Image not found in this shared album.");
				}

				const image = await prisma.images.findUnique({
					where: { image_id: params.imageId },
					include: { faces: true },
				});

				set.status = HTTP_STATUS_CODES.OK;
				return {
					status: "completed",
					message: "Image retrieved successfully.",
					data: {
						...image,
						imagePath: normalizeImagePath(image?.image_path),
						originalSize: {
							width: image?.original_width,
							height: image?.original_height,
						},
					},
				};
			} catch (error) {
				set.status = error?.statusCode || HTTP_STATUS_CODES.BAD_REQUEST;
				return {
					status: "error",
					message: error?.message || "Internal server error",
					data: null,
				};
			}
		},
		{
			params: t.Object({
				token: t.String(),
				imageId: t.String(),
			}),
		},
	)
	.post(
		"/faces/search",
		async ({ body, set }) => {
			try {
				// 1. Verify the share token
				const album = await prisma.albums.findUnique({
					where: { share_token: body.shareToken },
					include: {
						album_images: true,
					},
				});

				if (!album) {
					throw new NotFoundError("Invalid share token.");
				}

				// 2. Perform vector search but filter imageIds to only those in the album
				const albumImageIds = album.album_images.map((ai) => ai.image_id);

				const searchResults = await searchFaces({
					faceId: body.faceId,
					threshold: body.threshold || 0.6,
					limit: body.limit || 10,
					// Pass imageIds filter to the model search
					imageIds: albumImageIds as string[],
				});

				// 3. Transform paths for results
				const formattedResults = searchResults.map((result) => ({
					...result,
					imagePath: normalizeImagePath(result.imagePath),
				}));

				set.status = HTTP_STATUS_CODES.OK;
				return {
					status: "completed",
					message: "Scoped search completed successfully.",
					data: {
						faces: formattedResults,
					},
				};
			} catch (error) {
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
				shareToken: t.String(),
				faceId: t.Numeric(),
				threshold: t.Optional(t.Numeric()),
				limit: t.Optional(t.Numeric()),
			}),
		},
	)
	.post(
		"/albums/:token/search-by-image",
		async ({ params, body, set }) => {
			try {
				const selfie = body.selfie;
				if (!selfie) {
					throw new Error("Selfie image is required.");
				}

				// 1. Verify the share token and get albumId
				const album = await prisma.albums.findUnique({
					where: { share_token: params.token },
					include: { album_images: true },
				});

				if (!album) {
					throw new NotFoundError("Invalid share token.");
				}

				// 2. Save temporary selfie using StorageService
				const tempKey = `temp-selfie-${Date.now()}-${selfie.name}`;
				const fileBuffer = Buffer.from(await selfie.arrayBuffer());
				await storage.upload(fileBuffer, {
					key: tempKey,
					contentType: selfie.type,
				});

				// Get path for AI service
				const tempPath = path.resolve(process.cwd(), UPLOADS_DIR, tempKey);

				// 3. Call AI service to get embedding
				const aiServiceUrl = config[config.env].ai_service_url;
				const aiResponse = await axios.post(`${aiServiceUrl}/process`, {
					image_path: tempPath,
					image_id: crypto.randomUUID(),
				});

				const faceData = aiResponse.data;

				// Cleanup temp file
				await storage.delete(tempKey);

				if (
					!faceData.results ||
					faceData.results.length === 0 ||
					faceData.results[0].faces.length === 0
				) {
					throw new Error("No face detected in the selfie. Please try again.");
				}

				const searchEmbedding = faceData.results[0].faces[0].embedding;

				// 4. Perform scoped vector search
				const albumImageIds = album.album_images.map((ai) => ai.image_id);
				const searchResults = await searchFacesByEmbedding({
					embedding: searchEmbedding,
					threshold: 0.6,
					limit: 50,
					imageIds: albumImageIds as string[],
				});

				// 5. Transform results
				const formattedResults = searchResults.map((result) => ({
					...result,
					imagePath: normalizeImagePath(result.imagePath),
				}));

				set.status = HTTP_STATUS_CODES.OK;
				return {
					status: "completed",
					message: "Selfie search completed successfully.",
					data: {
						faces: formattedResults,
					},
				};
			} catch (error: any) {
				console.error("[SELFIE SEARCH] Error:", error.message);
				set.status = error?.statusCode || HTTP_STATUS_CODES.BAD_REQUEST;
				return {
					status: "error",
					message: error?.message || "Internal server error",
					data: null,
				};
			}
		},
		{
			params: t.Object({
				token: t.String(),
			}),
			body: t.Object({
				selfie: t.File(),
			}),
		},
	)
	.post(
		"/albums/:token/presigned-url",
		async ({ params, body, set }) => {
			try {
				const album = await prisma.albums.findUnique({
					where: { share_token: params.token },
					include: { storage_config: true },
				});

				if (!album) throw new NotFoundError("Album not found.");

				const key = `${Date.now()}-guest-${body.fileName}`;
				let currentStorage = storage;

				if (album.storage_config) {
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

				const uploadUrl = await (currentStorage as any).getUploadPresignedUrl(
					key,
					body.contentType,
				);

				set.status = HTTP_STATUS_CODES.OK;
				return {
					status: "completed",
					message: "Presigned URL generated successfully.",
					data: { uploadUrl, key },
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
			params: t.Object({ token: t.String() }),
			body: t.Object({
				fileName: t.String(),
				contentType: t.String(),
			}),
		},
	)
	.post(
		"/albums/:token/upload",
		async ({ params, body, set }) => {
			try {
				const album = await prisma.albums.findUnique({
					where: { share_token: params.token },
					include: { settings: true, storage_config: true },
				});

				if (!album) throw new NotFoundError("Album not found.");

				// Check Host Quota
				const hostId = album.created_by;
				if (hostId) {
					const quotaError = await checkQuota({ userId: hostId, set });
					if (quotaError) return quotaError;
				}

				const isCollaborative =
					album.settings?.is_event && album.settings?.allow_guest_uploads;
				const isExpired =
					album.settings?.expires_at &&
					new Date(album.settings.expires_at) < new Date();

				if (!isCollaborative || isExpired) {
					throw new Error(
						"Guest uploads are not allowed or have expired for this event.",
					);
				}

				const files = body.uploadedImages;
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
					const absolutePath = path.resolve(
						process.cwd(),
						UPLOADS_DIR,
						existingKey,
					);
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
					// Dynamic Storage Provider Selection
					let currentStorage = storage;
					if (album.storage_config) {
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

					convertedFiles = await Promise.all(
						(Array.isArray(files) ? files : [files]).map(async (file) => {
							const filename = `guest-${Date.now()}-${file.name}`;
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

				const status = album.settings?.requires_approval
					? "PENDING"
					: "APPROVED";

				const uploadResult = await uploadPicturesService({
					files: convertedFiles,
					status,
					userId: hostId || undefined, // Charge compute to host
				});

				const imageIds = uploadResult.images.map((img: any) => img.imageId);
				await createAlbumImageLinks(
					imageIds.map((id) => ({
						album_id: album.album_id,
						image_id: id,
					})),
				);

				set.status = HTTP_STATUS_CODES.CREATED;
				return {
					status: "completed",
					message:
						status === "PENDING"
							? "Images uploaded and pending approval."
							: "Images uploaded successfully.",
					data: uploadResult,
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
			params: t.Object({ token: t.String() }),
			body: t.Object({
				uploadedImages: t.Optional(t.Any()),
				key: t.Optional(t.String()),
			}),
		},
	);

export default publicRoutes;
