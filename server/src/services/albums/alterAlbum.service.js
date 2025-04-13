const joi = require("joi");
const { validateSpec, aliaserSpec } = require("@utils/specValidator.util");
const { getAlbum, updateAlbum } = require("./albums.lib");
const { NotFoundError } = require("@utils/error.util");

const spec = joi.object({
  album_name: joi.string().required(),
  album_id: joi.string().required(),
  created_by: joi.string().required(),
});

const aliasSpec = {
  request: {
    albumName: "album_name",
    albumId: "album_id",
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
  const { album_id, created_by, album_name } = validateSpec(spec, aliasReq);

  await getAlbum({ album_id, created_by });
  const alteredAlbum = await updateAlbum(album_id, created_by, { album_name });

  const aliasRes = aliaserSpec(aliasSpec.response, alteredAlbum);
  return aliasRes;
};

module.exports = service;
