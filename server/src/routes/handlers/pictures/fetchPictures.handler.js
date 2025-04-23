const authentication = require("@routes/middleware/authentication.middleware");
const fetchPicturesService = require("@services/pictures/fetchPictures.service");
const { HTTP_STATUS_CODES } = require("@utils/constants.util");

const handler = {
  method: "get",
  handler: async (req, res) => {
    try {
      const { userId, query, params } = req;
      const data = await fetchPicturesService({
        userId,
        ...query,
      });

      return res.status(HTTP_STATUS_CODES.OK).send({
        status: "completed",
        message: "Fetch Images successfully.",
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
  path: "/images",
  middlewares: [authentication],
};

module.exports = handler;
