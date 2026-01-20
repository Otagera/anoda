import { Elysia, t } from "elysia";
import prisma from "../../../../packages/config/src/db.config.ts";
import { searchFaces } from "../../../../packages/models/src/faces.model.ts";
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
					imagePath: normalizeImagePath(ai.images!.image_path),
					originalSize: {
						width: ai.images!.original_width,
						height: ai.images!.original_height,
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
						imagePath: normalizeImagePath(image!.image_path),
						originalSize: {
							width: image!.original_width,
							height: image!.original_height,
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
	);

export default publicRoutes;
