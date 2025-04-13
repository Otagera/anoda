const {
  createNewAlbum,
  fetchAlbum,
  fetchAlbumsByUserids,
  updateExistingAlbum,
  deleteAlbumById,
  deleteAlbumsByUserid,
} = require("@models/albums.model");

const createAlbum = async (albumData) => {
  if (!albumData.album_name) {
    throw new Error("Album name: album_name is required");
  }
  if (!albumData.created_by) {
    throw new Error("Creator: created_by is required");
  }
  return await createNewAlbum(albumData);
};

const updateAlbum = async (album_id, created_by, albumData) => {
  if (!album_id) {
    throw new Error("Album id: album_id is required");
  }
  if (!created_by) {
    throw new Error("Creator: created_by is required");
  }
  if (!albumData) {
    throw new Error("Album data: albumData is required");
  }
  return await updateExistingAlbum(album_id, created_by, albumData);
};

const getAlbums = async (albumIds) => {
  if (!albumIds) {
    throw new Error("Album ids: albumIds is required");
  }
  if (!Array.isArray(albumIds)) {
    return fetchAlbumsByUserids([albumIds]);
  }
  return fetchAlbumsByUserids(albumIds);
};

const getAlbum = async (where) => {
  if (!where) {
    throw new Error("No where clause provided");
  }
  if (!where.created_by && !where.album_id) {
    throw new Error("No created_by or album_id provided");
  }

  const album = fetchAlbum(where);

  if (!album) {
    throw new NotFoundError("Album not found.");
  }
  return album;
};

const deleteAlbum = async (album_id, created_by) => {
  if (!album_id) {
    throw new Error(`Album id: ${album_id} is required`);
  }
  if (!created_by) {
    throw new Error(`User id: ${created_by} is required`);
  }
  return await deleteAlbumById(album_id, created_by);
};

const deleteAlbums = async (created_by) => {
  if (!created_by) {
    throw new Error(`User id: ${created_by} is required`);
  }
  return await deleteAlbumsByUserid(created_by);
};

module.exports = {
  createAlbum,
  updateAlbum,
  getAlbums,
  getAlbum,
  deleteAlbum,
  deleteAlbums,
};
