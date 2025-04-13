const prisma = require("@config/db.config");

const deleteLinksByAlbumId = async (albumId) => {
  return await prisma.album_images.deleteMany({
    where: {
      album_id: albumId,
    },
  });
};
module.exports = {
  deleteLinksByAlbumId,
};
