const joi = require("joi");
const { validateSpec, aliaserSpec } = require("@utils/specValidator.util");
const { getAlbumLinksNoError, createAlbumLinks } = require("./albums.lib");

const spec = joi.object({
  image_ids: joi.array().items(joi.string().uuid()).required(),
  album_id: joi.string().uuid().required(),
  user_id: joi.string().uuid().required(),
});

const aliasSpec = {
  request: {
    imageIds: "image_ids",
    albumId: "album_id",
    userId: "user_id",
  },
  albumImage: {
    album_id: "albumId",
    image_id: "imageId",
    album_images_id: "albumImageId",
  },
  response: {
    album_images: "albumImages",
  },
};

const service = async (data) => {
  const aliasReq = aliaserSpec(aliasSpec.request, data);
  const params = validateSpec(spec, aliasReq);

  const imageInAlbum = await getAlbumLinksNoError(params);
  if (imageInAlbum && imageInAlbum.length) {
    return {
      idempotent: true,
      album_image: aliaserSpec(aliasSpec.response, imageInAlbum),
    };
  }

  let albumImages = await createAlbumLinks(params);

  albumImages = albumImages.map((albumImage) =>
    aliaserSpec(aliasSpec.albumImage, albumImage)
  );
  const aliasRes = aliaserSpec(aliasSpec.response, albumImages);

  return aliasRes;
};

module.exports = service;
