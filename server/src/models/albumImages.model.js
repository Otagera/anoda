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

module.exports = {
  createAlbumImageLink,
  createAlbumImageLinks,
  fetchAlbumImage,
  fetchAlbumImages,
  deleteLinksByAlbumId,
};
