const joi = require("joi");
const { validateSpec, aliaserSpec } = require("@utils/specValidator.util");
const { getAlbums } = require("./albums.lib");

const spec = joi.object({
  created_by: joi.string().required(),
});

const aliasSpec = {
  request: {
    userId: "created_by",
  },
  response: {
    albums: "albums",
  },
  album: {
    album_id: "id",
    album_name: "albumName",
    created_by: "userId",
    creation_date: "createdAt",
    shared_link: "sharedLink",
  },
};

const service = async (data) => {
  const aliasReq = aliaserSpec(aliasSpec.request, data);
  const { created_by } = validateSpec(spec, aliasReq);

  const albums = await getAlbums(created_by);

  const aliasRes = aliaserSpec(aliasSpec.response, {
    albums: albums.map((album) => aliaserSpec(aliasSpec.album, album)),
  });
  return aliasRes;
};

module.exports = service;
