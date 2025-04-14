const prisma = require("@config/db.config");

const createAlbumImageLink = async (data) => {
  return await prisma.album_images.create({ data });
};
const createAlbumImageLinks = async (data) => {
  return await prisma.album_images.createManyAndReturn({ data });
};

const fetchAlbumImage = async (where) => {
  return await prisma.album_images.findFirst({
    where,
    include: {
      images: true,
    },
  });
};

const fetchAlbumImages = async (where) => {
  return await prisma.album_images.findMany({
    where,
    include: {
      images: true,
    },
  });
};

const deleteLinksByAlbumId = async (albumId) => {
  if (!albumId) {
    throw new Error("Album ID is required");
  }
  const albumLinks = await fetchAlbumImages({ album_id: albumId });
  if (!albumLinks) {
    throw new Error("No album links found for the given album ID");
  }

  return await prisma.album_images.deleteMany({
    where: {
      album_id: albumId,
    },
  });
};

const deleteLinksByAlbumIdAndImageIds = async (albumId, imageIds) => {
  if (!albumId) {
    throw new Error("Album ID is required");
  }
  if (!imageIds && imageIds.length === 0) {
    throw new Error("Image IDs are required");
  }
  const albumLinks = await prisma.album_images.findMany({
    where: { album_id: albumId, image_id: { in: imageIds } },
    include: {
      images: true,
    },
  });
  if (!albumLinks) {
    throw new Error("No album links found for the given IDs");
  }

  return await prisma.album_images.deleteMany({
    where: {
      album_id: albumId,
      image_id: { in: imageIds },
    },
  });
};

module.exports = {
  createAlbumImageLink,
  createAlbumImageLinks,
  fetchAlbumImage,
  fetchAlbumImages,
  deleteLinksByAlbumId,
  deleteLinksByAlbumIdAndImageIds,
};
