const prisma = require("@config/db.config");

const createNewAlbum = async (data) => {
  return await prisma.albums.create({
    data,
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

const deleteAlbumsByUserId = async (userId) => {
  const transaction = await prisma.$transaction(async (prisma) => {
    // Find all albums created by the user
    const albumsToDelete = await prisma.albums.findMany({
      where: {
        created_by: userId,
      },
    });

    // Extract album IDs from the albums to delete
    const albumIdsToDelete = albumsToDelete.map((album) => album.album_id);
    // Find all album_images associated with the albums
    const albumImagesToDelete = await prisma.album_images.findMany({
      where: {
        album_id: { in: albumIdsToDelete },
      },
    });

    // Extract image IDs from the album_images to delete
    const imageIdsToDelete = albumImagesToDelete.map(
      (albumImage) => albumImage.image_id
    );

    await prisma.faces.deleteMany({
      where: {
        image_id: {
          in: imageIdsToDelete,
        },
      },
    });

    await prisma.images.deleteMany({
      where: {
        image_id: {
          in: imageIdsToDelete,
        },
      },
    });

    await prisma.album_images.deleteMany({
      where: {
        image_id: {
          in: imageIdsToDelete,
        },
      },
    });
    await prisma.albums.deleteMany({
      where: {
        album_id: {
          in: albumIdsToDelete,
        },
      },
    });
  });

  return transaction;
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
  deleteAlbumsByUserId,
  deleteAllAlbums,
};
