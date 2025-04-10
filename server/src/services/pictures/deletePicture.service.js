const Joi = require("joi");
const { validateSpec, aliaserSpec } = require("@utils/specValidator.util");
const { deleteImagesByIdsQuery } = require("@models/images.model");

const spec = Joi.object({
  pictureId: Joi.string().required(),
});

const aliasSpec = {
  request: {
    pictureId: "pictureId",
  },
  response: {},
};

const service = async (data) => {
  const aliasReq = aliaserSpec(aliasSpec.request, data);
  const { pictureId } = validateSpec(spec, aliasReq);

  const { rows } = await deleteImagesByIdsQuery([pictureId]);
  console.log("rows", rows);
  const aliasRes = aliaserSpec(aliasSpec.response, rows);
  return aliasRes;
};

module.exports = service;
