import fs from "node:fs/promises";
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
import { getPresignedUrlService } from "../services/pictures/getPresignedUrl.service.ts";
import { uploadPicturesService } from "../services/pictures/uploadPictures.service.ts";
import { checkQuota } from "./middleware/quota.middleware";

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
									deleted_at: null,
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

				// 2. Save temporary selfie locally AND to storage
				const tempKey = `temp-selfie-${Date.now()}-${crypto.randomUUID()}`;
				const fileBuffer = Buffer.from(await selfie.arrayBuffer());

				// Save locally for AI service to access
				const tempPath = path.resolve(process.cwd(), UPLOADS_DIR, tempKey);
				await fs.writeFile(tempPath, fileBuffer);

				// Also upload to storage if using R2/S3
				const currentStorage = storage.getProviderName();
				if (currentStorage !== "local") {
					await storage.upload(fileBuffer, {
						key: tempKey,
						contentType: selfie.type,
					});
				}

				// 3. Call AI service to get embedding
				const aiServiceUrl = config[config.env].ai_service_url;
				const aiResponse = await axios.post(`${aiServiceUrl}/process`, {
					image_path: tempPath,
					image_id: crypto.randomUUID(),
				});

				const faceData = aiResponse.data;

				// Cleanup temp file
				try {
					await fs.unlink(tempPath);
				} catch (_e) {}

				// Also cleanup from storage if using R2/S3
				if (storage.getProviderName() !== "local") {
					await storage.delete(tempKey);
				}

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
				const data = await getPresignedUrlService({
					...body,
					shareToken: params.token,
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
					include: {
						settings: true,
						storage_config: true,
						album_images: { include: { images: true }, take: 1 },
					},
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
				let useExternalStorage = false;
				let currentStorage = storage;
				let storageProvider: string | undefined;

				// Check album's own storage config first
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
					useExternalStorage = album.storage_config.provider !== "local";
					storageProvider = album.storage_config.provider;
				} else {
					// Check if images have external storage (from Managed R2)
					const firstImage = album.album_images[0]?.images;
					if (
						firstImage?.storage_provider &&
						firstImage.storage_provider !== "local"
					) {
						const envConfig = config[config.env || "development"];
						const r2 = envConfig?.r2;
						if (r2?.access_key_id && r2?.bucket) {
							currentStorage = storage.getProvider({
								provider: firstImage.storage_provider,
								credentials: {
									accessKeyId: r2.access_key_id,
									secretAccessKey: r2.secret_access_key,
									bucket: r2.bucket,
									endpoint: r2.endpoint || undefined,
									region: r2.region || "auto",
								},
							}) as any;
							useExternalStorage = true;
							storageProvider = firstImage.storage_provider;
						}
					}
				}

				if (existingKey) {
					let filePath: string;
					let fileSize = 0;

					if (useExternalStorage) {
						const imageBuffer = await currentStorage.getObject(existingKey);
						const absolutePath = path.resolve(
							process.cwd(),
							UPLOADS_DIR,
							existingKey,
						);
						await fs.mkdir(path.dirname(absolutePath), {
							recursive: true,
						});
						await fs.writeFile(absolutePath, imageBuffer);
						filePath = absolutePath;
						fileSize = imageBuffer.length;
					} else {
						filePath = path.resolve(process.cwd(), UPLOADS_DIR, existingKey);
						try {
							const stats = await fs.stat(filePath);
							fileSize = stats.size;
						} catch {
							throw new Error(`File not found: ${filePath}`);
						}
					}

					convertedFiles = [
						{
							mimetype: "image/jpeg",
							originalname: existingKey,
							fieldname: "uploadedImages",
							encoding: "7bit",
							destination: UPLOADS_DIR,
							filename: existingKey,
							path: filePath,
							size: fileSize,
							storage_provider: useExternalStorage ? storageProvider : "local",
							storage_key: existingKey,
						},
					];
				} else {
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
								storage_provider: useExternalStorage
									? storageProvider
									: "local",
								storage_key: storedKey,
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
			bodyLimit: 500 * 1024 * 1024,
		},
	);

export default publicRoutes;
