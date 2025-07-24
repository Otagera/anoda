const joi = require("joi");
const { validateSpec, aliaserSpec } = require("@utils/specValidator.util");
const { getAlbumLinks } = require("./albums.lib");
const { normalizeImagePath } = require("@utils/image.util");

const spec = joi.object({
  album_id: joi.string().required(),
  user_id: joi.string().required(),
});

const aliasSpec = {
  request: {
    albumId: "album_id",
    userId: "user_id",
  },
  response: {
    album_id: "albumId",
    imagesInAlbum: "imagesInAlbum",
  },
  image: {
    image_id: "imageId",
    faces: "faces",
    image_path: "imagePath",
    upload_date: "uploadDate",
    update_date: "updateDate",
    original_size: "originalSize",
    uploaded_by: "userId",
    album_images_id: "albumImageId",
  },
};

const service = async (data) => {
  const aliasReq = aliaserSpec(aliasSpec.request, data);
  const params = validateSpec(spec, aliasReq);

  const imagesInAlbum = await getAlbumLinks(params);

  if (!imagesInAlbum || imagesInAlbum.length === 0) {
    return aliaserSpec(aliasSpec.response, {
      imagesInAlbum: [],
      album_id: params.album_id,
    });
  }

  const aliasImagesInAlbum = imagesInAlbum.map((_image) => {
    const imageData = aliaserSpec(aliasSpec.image, {
      ..._image.images,
      original_size: {
        height: _image.images.original_height,
        width: _image.images.original_width,
      },
      image_path: normalizeImagePath(_image.images.image_path),
      album_images_id: _image.album_images_id,
    });

    return imageData;
  });

  const aliasRes = aliaserSpec(aliasSpec.response, {
    imagesInAlbum: aliasImagesInAlbum,
    album_id: params.album_id,
  });
  return aliasRes;
};

module.exports = service;
