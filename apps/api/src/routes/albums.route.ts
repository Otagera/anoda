import { Elysia, t } from "elysia";
import { HTTP_STATUS_CODES } from "../../../../packages/utils/src/constants.util.ts";
import { addImagesToAlbumService } from "../services/albums/addImagesToAlbum.service.ts";
import { alterAlbumService } from "../services/albums/alterAlbum.service.ts";
import { createAlbumService } from "../services/albums/createAlbum.service.ts";
import { fetchAlbumService } from "../services/albums/fetchAlbum.service.ts";
import { fetchAlbumsService } from "../services/albums/fetchAlbums.service.ts";
import { fetchImagesInAlbumService } from "../services/albums/fetchImagesInAlbum.service.ts";
import { removeAlbumService } from "../services/albums/removeAlbum.service.ts";
import { removeAlbumsService } from "../services/albums/removeAlbums.service.ts";
import { removeImagesInAlbumService } from "../services/albums/removeImagesInAlbum.service.ts";

import { authDerivation } from "./middleware/auth.plugin.ts";

const albumsRoutes = new Elysia({ prefix: "/albums" })
	.derive(authDerivation)
	.post(
		"/",
		async ({ body, set, userId }) => {
			try {
				const data = await createAlbumService({
					albumName: body.albumName,
					userId: userId,
				});

				set.status = HTTP_STATUS_CODES.CREATED;
				return {
					status: "completed",
					message: `Album created successfully.`,
					data,
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
				albumName: t.String(),
			}),
		},
	)
	.get("/", async ({ set, userId }) => {
		try {
			const data = await fetchAlbumsService({ userId });

			set.status = HTTP_STATUS_CODES.OK;
			return {
				status: "completed",
				message: `Albums retrieved successfully.`,
				data,
			};
		} catch (error) {
			set.status = error?.statusCode || HTTP_STATUS_CODES.BAD_REQUEST;
			return {
				status: "error",
				message: error?.message || "Internal server error",
				data: null,
			};
		}
	})
	.get(
		"/:albumId",
		async ({ params, set, userId }) => {
			try {
				const albumId = params.albumId;

				const data = await fetchAlbumService({ userId, albumId });

				set.status = HTTP_STATUS_CODES.OK;
				return {
					status: "completed",
					message: `Album: ${albumId} retrieved successfully.`,
					data,
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
				albumId: t.String(), // Assuming albumId is a string/UUID
			}),
		},
	)
	.put(
		"/:albumId",
		async ({ params, body, set, userId }) => {
			try {
				const albumId = params.albumId;
				console.log("body", body);

				const data = await alterAlbumService({ ...body, userId, albumId });

				set.status = HTTP_STATUS_CODES.OK;
				return {
					status: "completed",
					message: `Album: ${albumId} updated successfully.`,
					data,
				};
			} catch (error) {
				console.log("Error occurred while editing album:", error);
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
				albumId: t.String(), // Assuming albumId is a string/UUID
			}),
			body: t.Object({
				albumName: t.Optional(t.String()),
				shareToken: t.Optional(t.Nullable(t.String())),
				settings: t.Optional(
					t.Object({
						is_event: t.Optional(t.Boolean()),
						requires_approval: t.Optional(t.Boolean()),
						tagging_policy: t.Optional(t.String()),
						expires_at: t.Optional(t.Nullable(t.String())),
						allow_guest_uploads: t.Optional(t.Boolean()),
					}),
				),
				storageConfigId: t.Optional(t.Nullable(t.String())),
			}),
		},
	)
	.delete(
		"/:albumId",
		async ({ params, set, userId }) => {
			try {
				const albumId = params.albumId;

				const data = await removeAlbumService({ userId, albumId });

				set.status = HTTP_STATUS_CODES.OK;
				return {
					status: "completed",
					message: `Album: ${albumId} deleted successfully.`,
					data,
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
				albumId: t.String(), // Assuming albumId is a string/UUID
			}),
		},
	)
	.get(
		"/:albumId/images",
		async ({ params, query, set, userId }) => {
			try {
				const albumId = params.albumId;

				const data = await fetchImagesInAlbumService({
					...query, // Assuming query params for filtering/pagination
					userId,
					albumId,
				});

				set.status = HTTP_STATUS_CODES.OK;
				return {
					status: "completed",
					message: `Album images retrieved successfully.`,
					data,
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
				albumId: t.String(), // Assuming albumId is a string/UUID
			}),
			query: t.Object({
				limit: t.Optional(t.String()),
				nextCursor: t.Optional(t.String()),
				paginationType: t.Optional(t.String()),
				status: t.Optional(t.String()),
			}),
		},
	)
	.post(
		"/:albumId/images",
		async ({ params, body, set, userId }) => {
			try {
				const albumId = params.albumId;

				const data = await addImagesToAlbumService({
					...body,
					userId,
					albumId,
				});

				if (data.idempotent) {
					set.status = HTTP_STATUS_CODES.OK;
					return {
						status: "completed",
						message: `Image already exists in the album.`,
						data: data.album_image,
					};
				}
				set.status = HTTP_STATUS_CODES.CREATED;
				return {
					status: "completed",
					message: `Image added to album successfully.`,
					data,
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
				albumId: t.String(), // Assuming albumId is a string/UUID
			}),
			body: t.Object({
				imageIds: t.Array(t.String()), // Assuming imageIds is an array of strings/UUIDs
			}),
		},
	)
	.post(
		"/:albumId/images/delete-batch",
		async ({ params, body, set, userId }) => {
			try {
				const albumId = params.albumId;

				const data = await removeImagesInAlbumService({
					...body,
					userId,
					albumId,
				});

				set.status = HTTP_STATUS_CODES.OK;
				return {
					status: "completed",
					message: `Image(s) removed from album successfully.`,
					data,
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
				albumId: t.String(), // Assuming albumId is a string/UUID
			}),
			body: t.Object({
				imageIds: t.Array(t.String()), // Assuming imageIds is an array of strings/UUIDs
			}),
		},
	)
	.post(
		"/:albumId/cluster",
		async ({ params, set, userId }) => {
			try {
				const albumId = params.albumId;
				console.log(
					`[CLUSTER] Triggered for album ${albumId} by user ${userId}`,
				);

				// Dynamic import to ensure queueServices is ready and avoid circular deps
				const { queueServices: localQueueServices } = await import(
					"../../../worker/src/queue/queue.service.ts"
				);

				if (!localQueueServices) {
					throw new Error("Queue services not initialized");
				}

				// We first verify the album exists and belongs to the user
				await fetchAlbumService({ userId, albumId });

				await localQueueServices.faceClusteringQueueLib.addJob(
					"faceClustering",
					{
						albumId,
						worker: "faceClustering",
					},
					{ removeOnComplete: { count: 100 }, removeOnFail: { count: 100 } },
				);

				set.status = HTTP_STATUS_CODES.OK;
				return {
					status: "completed",
					message: `Face clustering initiated for album: ${albumId}`,
					data: null,
				};
			} catch (error: any) {
				console.error("[CLUSTER] Route Error:", error.message);
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
				albumId: t.String(),
			}),
		},
	)
	.delete("/", async ({ set, userId }) => {
		try {
			const data = await removeAlbumsService({ userId });

			set.status = HTTP_STATUS_CODES.OK;
			return {
				status: "completed",
				message: `Albums deleted successfully.`,
				data,
			};
		} catch (error) {
			set.status = error?.statusCode || HTTP_STATUS_CODES.BAD_REQUEST;
			return {
				status: "error",
				message: error?.message || "Internal server error",
				data: null,
			};
		}
	});

export default albumsRoutes;
