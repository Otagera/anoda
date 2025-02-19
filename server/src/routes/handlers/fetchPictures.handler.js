const fetchPicturesService = require("@services/fetchPictures.service");
const { HTTP_STATUS_CODES } = require("@utils/constants.util");

const handler = {
  method: "get",
  handler: async (req, res) => {
    try {
      const data = await fetchPicturesService();
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
  path: "/pictures",
  middlewares: [],
};

module.exports = handler;
