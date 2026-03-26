import joi from "joi";
import { normalizeImagePath } from "../../../../../packages/utils/src/image.util.ts";
import {
	aliaserSpec,
	validateSpec,
} from "../../../../../packages/utils/src/specValidator.util.ts";
import { getAlbums } from "./albums.lib";

const spec = joi.object({
	created_by: joi.string().required(),
});

const aliasSpec = {
	request: {
		userId: "created_by",
	},
	response: {
		albums: "albums",
	},
	album: {
		album_id: "id",
		album_name: "albumName",
		created_by: "userId",
		creation_date: "createdAt",
		shared_link: "sharedLink",
		coverImages: "coverImages",
		_count: "_count",
	},
};

const service = async (data) => {
	const aliasReq = aliaserSpec(aliasSpec.request, data);
	const { created_by } = validateSpec(spec, aliasReq);

	const albums = await getAlbums(created_by);

	const mappedAlbums = albums.map((album: any) => {
		const coverImages =
			album.album_images
				?.map((ai: any) => ai.images?.image_path)
				.filter(Boolean)
				.map(normalizeImagePath) || [];

		return {
			...album,
			coverImages,
			_count: {
				images: album._count?.album_images || 0,
			},
		};
	});

	const aliasRes = aliaserSpec(aliasSpec.response, {
		albums: mappedAlbums.map((album) => aliaserSpec(aliasSpec.album, album)),
	});
	return aliasRes;
};

export const fetchAlbumsService = service;
