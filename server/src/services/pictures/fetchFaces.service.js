const Joi = require("joi");
const { validateSpec, aliaserSpec } = require("@utils/specValidator.util");
const { normalizeImagePath } = require("@utils/image.util");
const { getFaces } = require("./pictures.lib");

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
    faces: "faces",
  },
  face: {
    face_id: "faceId",
    image_id: "imageId",
    embedding: "embedding",
    bounding_box: "boundingBox",
    processed_time: "processedTime",
  },
  bounding_box: {
    top: "top",
    left: "left",
    right: "right",
    bottom: "bottom",
  },
};

const service = async (data) => {
  const aliasReq = aliaserSpec(aliasSpec.request, data);
  const params = validateSpec(spec, aliasReq);

  const faces = await getFaces(params);

  const aliasRes = aliaserSpec(aliasSpec.response, {
    faces: faces.map((face) => {
      const boundingBox = aliaserSpec(
        aliasSpec.bounding_box,
        face.bounding_box
      );
      const faceData = aliaserSpec(aliasSpec.face, {
        ...face,
        bounding_box: boundingBox,
      });
      return faceData;
    }),
  });
  return aliasRes;
};

module.exports = service;
