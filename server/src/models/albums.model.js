const prisma = require("@config/db.config");

const createNewAlbum = async (userData) => {
  return await prisma.albums.create({
    data: {
      ...userData,
    },
  });
};

const updateExistingAlbum = async (album_id, created_by, userData) => {
  return await prisma.albums.update({
    where: {
      album_id,
      created_by,
    },
    data: userData,
  });
};

const fetchAlbum = async (where) => {
  return await prisma.albums.findUnique({
    where,
  });
};

const fetchAlbumsByIds = async (albumIds) => {
  return await prisma.albums.findMany({
    where: {
      album_id: {
        in: albumIds,
      },
    },
  });
};

const fetchAlbumsByUserids = async (userIds) => {
  return await prisma.albums.findMany({
    where: {
      created_by: {
        in: userIds,
      },
    },
  });
};

const fetchAllAlbums = async () => {
  return await prisma.albums.findMany();
};

const deleteAlbumById = async (albumId, userId) => {
  return await prisma.albums.delete({
    where: {
      album_id: albumId,
      created_by: userId,
    },
  });
};

const deleteAlbumsByIds = async (albumIds) => {
  const transaction = await prisma.$transaction(async (prisma) => {
    await prisma.albums.deleteMany({
      where: {
        album_id: {
          in: albumIds,
        },
      },
    });
  });

  return transaction;
};

const deleteAlbumsByUserid = async (created_by) => {
  return await prisma.albums.deleteMany({
    where: {
      created_by,
    },
  });
};

const deleteAllAlbums = async () => {
  const transaction = await prisma.$transaction(async (prisma) => {
    await prisma.albums.deleteMany({});
  });

  return transaction;
};

module.exports = {
  createNewAlbum,
  updateExistingAlbum,
  fetchAlbum,
  fetchAlbumsByIds,
  fetchAlbumsByUserids,
  fetchAllAlbums,
  deleteAlbumById,
  deleteAlbumsByIds,
  deleteAlbumsByUserid,
  deleteAllAlbums,
};
