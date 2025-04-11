const authentication = require("@routes/middleware/authentication.middleware");
const fetchAlbumsService = require("@services/albums/fetchAlbums.service");
const { HTTP_STATUS_CODES } = require("@utils/constants.util");

const handler = {
  method: "get",
  handler: async (req, res) => {
    try {
      const data = await fetchAlbumsService({ userId: req.userId });
      return res.status(HTTP_STATUS_CODES.OK).send({
        status: "completed",
        message: `Albums retrieved successfully.`,
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
