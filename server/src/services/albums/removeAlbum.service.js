const joi = require("joi");
const { validateSpec, aliaserSpec } = require("@utils/specValidator.util");
const { getAlbum, deleteAlbum } = require("./albums.lib");
const { NotFoundError } = require("@utils/error.util");

const spec = joi.object({
  album_id: joi.string().required(),
  created_by: joi.string().required(),
});

const aliasSpec = {
  request: {
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
  const params = validateSpec(spec, aliasReq);

  const album = await getAlbum(params);

  const deletedAlbum = await deleteAlbum(params.album_id, params.created_by);

  const aliasRes = aliaserSpec(aliasSpec.response, deletedAlbum);
  return aliasRes;
};

module.exports = service;
