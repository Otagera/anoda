const joi = require("joi");
const { validateSpec, aliaserSpec } = require("@utils/specValidator.util");
const { createAlbum } = require("./albums.lib");

const spec = joi.object({
  album_name: joi.string().required(),
  created_by: joi.string().required(),
});

const aliasSpec = {
  request: {
    albumName: "album_name",
    userId: "created_by",
  },
  response: {
    album_id: "id",
    album_name: "albumName",
    created_by: "userId",
    creation_date: "createdAt",
    shared_link: "sharedLink",
  },
};

const service = async (data) => {
  const aliasReq = aliaserSpec(aliasSpec.request, data);
  const params = validateSpec(spec, aliasReq);

  const newAlbum = await createAlbum(params);

  const aliasRes = aliaserSpec(aliasSpec.response, newAlbum);
  return aliasRes;
};

module.exports = service;
