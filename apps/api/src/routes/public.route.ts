import path from "node:path";
import axios from "axios";
import { Elysia, t } from "elysia";
import prisma from "../../../../packages/config/src/db.config.ts";
import config from "../../../../packages/config/src/index.config.ts";
import {
	searchFaces,
	searchFacesByEmbedding,
} from "../../../../packages/models/src/faces.model.ts";
import { HTTP_STATUS_CODES } from "../../../../packages/utils/src/constants.util.ts";
import { NotFoundError } from "../../../../packages/utils/src/error.util.ts";
import { normalizeImagePath } from "../../../../packages/utils/src/image.util.ts";

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
						},
					},
				});

				if (!album) {
					throw new NotFoundError("Album not found or link expired.");
				}

				// Format response to match private fetchAlbumService but without owner info
				const images = album.album_images.map((ai) => ({
					...ai.images,
					imageId: ai.images?.image_id,
					imagePath: normalizeImagePath(ai.images?.image_path),
					originalSize: {
						width: ai.images?.original_width,
						height: ai.images?.original_height,
					},
				}));

				set.status = HTTP_STATUS_CODES.OK;
				return {
					status: "completed",
					message: "Shared album retrieved successfully.",
					data: {
						id: album.album_id,
						albumName: album.album_name,
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

				// 2. Save temporary selfie to disk for AI service to read
				const tempFilename = `selfie-${Date.now()}-${selfie.name}`;
				const tempPath = path.resolve("src/uploads", tempFilename);
				await Bun.write(tempPath, selfie);

				// 3. Call AI service to get embedding
				const aiServiceUrl = config[config.env].ai_service_url;
				const aiResponse = await axios.post(`${aiServiceUrl}/process`, {
					image_path: tempPath,
					image_id: crypto.randomUUID(),
				});

				const faceData = aiResponse.data;
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
	);

export default publicRoutes;
