const authentication = require("@routes/middleware/authentication.middleware");
const createAlbumService = require("@services/albums/createAlbum.service");
const { HTTP_STATUS_CODES } = require("@utils/constants.util");

const handler = {
  method: "post",
  handler: async (req, res) => {
    try {
      const data = await createAlbumService({
        ...req.body,
        userId: req.userId,
      });
      return res.status(HTTP_STATUS_CODES.CREATED).send({
        status: "completed",
        message: `Album created successfully.`,
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
