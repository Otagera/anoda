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
  response: {
    count: "count",
  },
};

const service = async (data) => {
  const aliasReq = aliaserSpec(aliasSpec.request, data);
  const params = validateSpec(spec, aliasReq);

  const deletedAlbum = await deleteAlbums(params.created_by);

  const aliasRes = aliaserSpec(aliasSpec.response, deletedAlbum);
  return aliasRes;
};

module.exports = service;
