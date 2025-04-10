const joi = require("joi");
const { validateSpec, aliaserSpec } = require("@utils/specValidator.util");
const { fetchAllImagesQuery } = require("@models/images.model");
const { normalizeImagePath } = require("@utils/image.util");

const spec = joi.object({
  page: joi.string(),
  limit: joi.string(),
});

const aliasSpec = {
  request: {
    page: "page",
    limit: "limit",
  },
  response: {},
};

const service = async (data) => {
  const aliasReq = aliaserSpec(aliasSpec.request, data);
  const params = validateSpec(spec, aliasReq);

  const { rows } = await fetchAllImagesQuery();

  const aliasRes = aliaserSpec(aliasSpec.response, normalizeImagePath(rows));
  return aliasRes;
};

module.exports = service;
