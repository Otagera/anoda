const deletePicturesService = require("@services/deletePictures.service");
const { HTTP_STATUS_CODES } = require("@utils/constants.util");

const handler = {
  method: "delete",
  handler: async (req, res) => {
    try {
      const data = await deletePicturesService();
      return res.status(HTTP_STATUS_CODES.OK).send({
        status: "completed",
        message: `Successfully deleted pictures`,
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
