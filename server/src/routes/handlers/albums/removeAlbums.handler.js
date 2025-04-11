const authentication = require("@routes/middleware/authentication.middleware");
const removeAlbumsService = require("@services/albums/removeAlbums.service");
const { HTTP_STATUS_CODES } = require("@utils/constants.util");

const handler = {
  method: "delete",
  handler: async (req, res) => {
    try {
      const userId = req.userId;
      const data = await removeAlbumsService({ userId });
      return res.status(HTTP_STATUS_CODES.OK).send({
        status: "completed",
        message: `Albums deleted successfully.`,
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
  path: "/albums",
  middlewares: [authentication],
};

module.exports = handler;
