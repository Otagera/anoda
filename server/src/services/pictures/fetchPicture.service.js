const Joi = require("joi");
const { validateSpec, aliaserSpec } = require("@utils/specValidator.util");
const { normalizeImagePath } = require("@utils/image.util");
const { getImage } = require("./pictures.lib");

const spec = Joi.object({
  image_id: Joi.string().uuid().required(),
  uploaded_by: Joi.string().uuid().required(),
});

const aliasSpec = {
  request: {
    imageId: "image_id",
    userId: "uploaded_by",
  },
  response: {
    image_id: "imageId",
    faces: "faces",
    image_path: "imagePath",
    upload_date: "uploadDate",
    update_date: "updateDate",
    original_size: "originalSize",
    uploaded_by: "userId",
  },
};

const service = async (data) => {
  const aliasReq = aliaserSpec(aliasSpec.request, data);
  const params = validateSpec(spec, aliasReq);

  const image = await getImage(params);

  const aliasRes = aliaserSpec(aliasSpec.response, {
    ...image,
    original_size: {
      height: image.original_height,
      width: image.original_width,
    },
    image_path: normalizeImagePath(image.image_path),
  });
  return aliasRes;
};

module.exports = service;
