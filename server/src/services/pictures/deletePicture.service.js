const Joi = require("joi");
const { validateSpec, aliaserSpec } = require("@utils/specValidator.util");
const { removeImage } = require("./pictures.lib");

const spec = Joi.object({
  image_id: Joi.string().required(),
  uploaded_by: Joi.string().required(),
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
    original_size: "originalSize",
    uploaded_by: "userId",
  },
};

const service = async (data) => {
  const aliasReq = aliaserSpec(aliasSpec.request, data);
  const params = validateSpec(spec, aliasReq);

  await removeImage(params);

  const aliasRes = aliaserSpec(aliasSpec.response, {
    image_id: params.image_id,
    uploaded_by: params.uploaded_by,
  });
  return aliasRes;
};

module.exports = service;
