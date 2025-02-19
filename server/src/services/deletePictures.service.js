const joi = require("joi");
const { validateSpec, aliaserSpec } = require("@utils/specValidator.util");
const { deleteAllImagesQuery } = require("@models/images.models");

const spec = joi.object({});

const aliasSpec = {
  request: {},
  response: {},
};

const service = async (data) => {
  const aliasReq = aliaserSpec(aliasSpec.request, data);
  const { pictureId } = validateSpec(spec, aliasReq);

  const { rows } = await deleteAllImagesQuery();

  const aliasRes = aliaserSpec(aliasSpec.response, normalizeImagePath(rows));
  return aliasRes;
};

module.exports = service;
