const authentication = require("@routes/middleware/authentication.middleware");
const addImagesToAlbumService = require("@services/albums/addImagesToAlbum.service");
const { HTTP_STATUS_CODES } = require("@utils/constants.util");

const handler = {
  method: "post",
  handler: async (req, res) => {
    try {
      const userId = req.userId;
      const albumId = req.params.albumId;
      const data = await addImagesToAlbumService({
        ...req.body,
        userId,
        albumId,
      });
      if (data.idempotent) {
        return res.status(HTTP_STATUS_CODES.OK).send({
          status: "completed",
          message: `Image already exists in the album.`,
          data: data.album_image,
        });
      }
      return res.status(HTTP_STATUS_CODES.CREATED).send({
        status: "completed",
        message: `Image added to album successfully.`,
        data,
      });
    } catch (error) {
      return res
        .status(error?.statusCode || HTTP_STATUS_CODES.BAD_REQUEST)
        .send({
          status: "error",
          message: error?.message || "Internal server error",
          data: null,
        });
    }
  },
  path: "/albums/:albumId/images",
  middlewares: [authentication],
};

module.exports = handler;
