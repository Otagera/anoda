const authentication = require("@routes/middleware/authentication.middleware");
const fetchAlbumService = require("@services/albums/fetchAlbum.service");
const { HTTP_STATUS_CODES } = require("@utils/constants.util");

const handler = {
  method: "get",
  handler: async (req, res) => {
    try {
      const userId = req.userId;
      const albumId = req.params.albumId;
      const data = await fetchAlbumService({ userId, albumId });
      return res.status(HTTP_STATUS_CODES.OK).send({
        status: "completed",
        message: `Album: ${albumId} retrieved successfully.`,
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
  path: "/albums/:albumId",
  middlewares: [authentication],
};

module.exports = handler;
