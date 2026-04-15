import { Elysia, t } from "elysia";
import prisma from "../../../../packages/config/src/db.config.ts";
import { HTTP_STATUS_CODES } from "../../../../packages/utils/src/constants.util.ts";
import { normalizeImagePath } from "../../../../packages/utils/src/image.util.ts";
import { restoreAlbumService } from "../services/albums/restoreAlbum.service.ts";
import restorePictureService from "../services/pictures/restorePicture.service.ts";
import { authDerivation } from "./middleware/auth.plugin.ts";

const trashRoutes = new Elysia({ prefix: "/trash" })
	.derive(authDerivation)
	.get("/", async ({ userId, set }) => {
		try {
			// Fetch soft-deleted albums
			const deletedAlbums = await prisma.albums.findMany({
				where: {
					created_by: userId,
					deleted_at: { not: null },
				},
				orderBy: { deleted_at: "desc" },
			});

			// Fetch soft-deleted images
			const deletedImages = await prisma.images.findMany({
				where: {
					uploaded_by: userId,
					deleted_at: { not: null },
				},
				orderBy: { deleted_at: "desc" },
			});

			return {
				status: "completed",
				data: {
					albums: deletedAlbums.map((a) => ({
						id: a.album_id,
						name: a.album_name,
						deletedAt: a.deleted_at,
					})),
					images: deletedImages.map((img) => ({
						id: img.image_id,
						path: normalizeImagePath(img.image_path),
						deletedAt: img.deleted_at,
					})),
				},
			};
		} catch (error: any) {
			set.status = HTTP_STATUS_CODES.BAD_REQUEST;
			return { status: "error", message: error.message };
		}
	})
	.post(
		"/images/restore",
		async ({ body, userId, set }) => {
			try {
				const data = await restorePictureService({
					...body,
					userId,
				});
				return {
					status: "completed",
					message: "Images restored successfully",
					data,
				};
			} catch (error: any) {
				set.status = HTTP_STATUS_CODES.BAD_REQUEST;
				return { status: "error", message: error.message };
			}
		},
		{
			body: t.Object({
				imageIds: t.Array(t.String()),
			}),
		},
	)
	.post(
		"/albums/:albumId/restore",
		async ({ params, userId, set }) => {
			try {
				const data = await restoreAlbumService({
					albumId: params.albumId,
					userId,
				});
				return {
					status: "completed",
					message: "Album restored successfully",
					data,
				};
			} catch (error: any) {
				set.status = HTTP_STATUS_CODES.BAD_REQUEST;
				return { status: "error", message: error.message };
			}
		},
		{
			params: t.Object({
				albumId: t.String(),
			}),
		},
	);

export default trashRoutes;
