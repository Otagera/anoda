const joi = require("joi");
const { validateSpec, aliaserSpec } = require("@utils/specValidator.util");
const {
  getAlbumLinks,
} = require("./albums.lib");
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
    imagesInAlbum: "imagesInAlbum",
  },
  imageInAlbum: {
    album_id: "albumId",
    image_id: "imageId",
    album_images_id: "albumImageId",
    images: "images",
  },
  image: {
    image_id: "imageId",
    faces: "faces",
    image_path: "imagePath",
    upload_date: "uploadDate",
    original_size: "originalSize",
    uploaded_by: "userId",
  },
};

const service = async (data) => {
  const aliasReq = aliaserSpec(aliasSpec.request, data);
  const params = validateSpec(spec, aliasReq);

  const imagesInAlbum = await getAlbumLinks(params);

  const aliasImagesInAlbum = imagesInAlbum
    .map((imageInAlbum) => aliaserSpec(aliasSpec.imageInAlbum, imageInAlbum))
    .map((image) => {
      const imageData = aliaserSpec(aliasSpec.image, {
        ...image.images,
        original_size: {
          height: image.images.original_height,
          width: image.images.original_width,
        },
        image_path: normalizeImagePath(image.images.image_path),
      });
      return {
        ...image,
        images: imageData,
      };
    });
  const aliasRes = aliaserSpec(aliasSpec.response, {
    imagesInAlbum: aliasImagesInAlbum,
  });
  return aliasRes;
};

module.exports = service;
