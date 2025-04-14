const joi = require("joi");
const { validateSpec, aliaserSpec } = require("@utils/specValidator.util");
const { createAlbumLink, getAlbumLinkNoError } = require("./albums.lib");

const spec = joi.object({
  image_id: joi.string().required(),
  album_id: joi.string().required(),
  user_id: joi.string().required(),
});

const aliasSpec = {
  request: {
    imageId: "image_id",
    albumId: "album_id",
    userId: "user_id",
  },
  response: {
    album_id: "albumId",
    image_id: "imageId",
    album_images_id: "albumImageId",
  },
};

const service = async (data) => {
  const aliasReq = aliaserSpec(aliasSpec.request, data);
  const params = validateSpec(spec, aliasReq);

  const imageInAlbum = await getAlbumLinkNoError(params);
  if (imageInAlbum) {
    return {
      idempotent: true,
      album_image: aliaserSpec(aliasSpec.response, imageInAlbum),
    };
  }
  const newAlbumLink = await createAlbumLink(params);

  const aliasRes = aliaserSpec(aliasSpec.response, newAlbumLink);
  return aliasRes;
};

module.exports = service;
