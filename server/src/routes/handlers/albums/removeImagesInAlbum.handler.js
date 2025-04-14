const authentication = require("@routes/middleware/authentication.middleware");
const removeImagesInAlbumService = require("@services/albums/removeImagesInAlbum.service");
const { HTTP_STATUS_CODES } = require("@utils/constants.util");

const handler = {
  method: "post",
  handler: async (req, res) => {
    try {
      const userId = req.userId;
      const albumId = req.params.albumId;
      const data = await removeImagesInAlbumService({
        ...req.body,
        userId,
        albumId,
      });
      return res.status(HTTP_STATUS_CODES.OK).send({
        status: "completed",
        message: `Image(s) removed from album successfully.`,
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
  path: "/albums/:albumId/images/delete-batch",
  middlewares: [authentication],
};

module.exports = handler;
