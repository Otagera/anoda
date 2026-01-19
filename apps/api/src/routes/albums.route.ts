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

import { authPlugin } from "./middleware/auth.plugin.ts";

const albumsRoutes = new Elysia({ prefix: "/albums" })
	.use(authPlugin)
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
	.get(
		"/",
		async ({ set, userId }) => {
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
		},
		{
			params: t.Object({
				albumId: t.Optional(t.String()), // Assuming albumId is a string/UUID
			}),
		},
	)
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

				const data = await alterAlbumService({ ...body, userId, albumId });

				set.status = HTTP_STATUS_CODES.OK;
				return {
					status: "completed",
					message: `Album: ${albumId} updated successfully.`,
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
				albumName: t.String(),
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
				// Assuming query parameters for filtering/pagination
				// Add specific query params here, e.g.,
				// limit: t.Optional(t.Numeric()),
				// page: t.Optional(t.Numeric()),
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