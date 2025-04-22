const joi = require("joi");
const { validateSpec, aliaserSpec } = require("@utils/specValidator.util");
const { deleteAlbums } = require("./albums.lib");

const spec = joi.object({
  created_by: joi.string().required(),
});

const aliasSpec = {
  request: {
    userId: "created_by",
  },
  response: {},
};

const service = async (data) => {
  const aliasReq = aliaserSpec(aliasSpec.request, data);
  const params = validateSpec(spec, aliasReq);

  await deleteAlbums(params.created_by);

  return {};
};

module.exports = service;
