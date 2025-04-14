const {
  createAlbumImageLink,
  fetchAlbumImages,
  fetchAlbumImage,
} = require("@models/albumImages.model");
const {
  createNewAlbum,
  fetchAlbum,
  fetchAlbumsByUserids,
  updateExistingAlbum,
  deleteAlbumById,
  deleteAlbumsByUserid,
} = require("@models/albums.model");
const { fetchImage } = require("@models/images.model");
const { NotFoundError } = require("@utils/error.util");

const albumLinkValidation = async (
  albumLinkData,
  options = { check_image_id: true }
) => {
  const { check_image_id } = options;
  if (!albumLinkData.album_id) {
    throw new Error("Album Id: album_id is required");
  }
  if (check_image_id && !albumLinkData.image_id) {
    throw new Error("Image Id: image_id is required");
  }
  if (!albumLinkData.user_id) {
    throw new Error("Creator: user_id is required");
  }
  const { image_id, album_id, user_id } = albumLinkData;

  const image = await fetchImage({ image_id, uploaded_by: user_id });
  if (!image) {
    throw new NotFoundError("Image not found.");
  }

  const album = await getAlbum({ album_id, created_by: user_id });
  if (!album) {
    console.log("[album]", album);
    throw new NotFoundError("Album not found.");
  }
};

const createAlbum = async (albumData) => {
  if (!albumData.album_name) {
    throw new Error("Album name: album_name is required");
  }
  if (!albumData.created_by) {
    throw new Error("Creator: created_by is required");
  }
  return await createNewAlbum(albumData);
};

const createAlbumLink = async (albumLinkData) => {
  await albumLinkValidation(albumLinkData);
  const { image_id, album_id } = albumLinkData;

  return await createAlbumImageLink({ image_id, album_id });
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

const getAlbumLinkNoError = async (where) => {
  await albumLinkValidation(where);

  const { image_id, album_id } = where;
  const album = fetchAlbumImage({ album_id, image_id });

  return album;
};

const getAlbumLink = async (where) => {
  albumLinkValidation(where);

  const { image_id, album_id } = where;
  const album = fetchAlbumImage({ album_id, image_id });

  if (!album) {
    throw new NotFoundError("Album Image not found.");
  }
  return album;
};

const getAlbumLinksNoError = async (where) => {
  await albumLinkValidation(where);

  const { image_id, album_id } = where;
  const album = fetchAlbumImages({ album_id, image_id });

  return album;
};

const getAlbumLinks = async (where) => {
  await albumLinkValidation(where, { check_image_id: false });

  const { image_id, album_id } = where;
  const album = await fetchAlbumImages({ album_id, image_id });

  if (!album || !album.length) {
    return [];
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
  createAlbumLink,
  updateAlbum,
  getAlbums,
  getAlbum,
  getAlbumLinkNoError,
  getAlbumLinksNoError,
  getAlbumLinks,
  getAlbumLink,
  deleteAlbum,
  deleteAlbums,
};
