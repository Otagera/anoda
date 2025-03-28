const Joi = require("joi");
const { validateSpec, aliaserSpec } = require("@utils/specValidator.util");
const { fetchImagesByIdsQuery } = require("@models/images.models");

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

  const { rows } = await fetchImagesByIdsQuery([pictureId]);

  const aliasRes = aliaserSpec(aliasSpec.response, normalizeImagePath(rows));
  return aliasRes;
};

module.exports = service;
