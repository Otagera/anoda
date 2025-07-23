const joi = require("joi");
const { validateSpec, aliaserSpec } = require("@utils/specValidator.util");
const { deleteAllImages } = require("@models/images.model");

const spec = joi.object({});

const aliasSpec = {
  request: {},
  response: {},
};

const service = async (data) => {
  const aliasReq = aliaserSpec(aliasSpec.request, data);
  validateSpec(spec, aliasReq);

  const result = await deleteAllImages();

  const aliasRes = aliaserSpec(aliasSpec.response, normalizeImagePath(result));
  return aliasRes;
};

module.exports = service;
