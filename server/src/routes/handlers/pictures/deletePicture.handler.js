const deletePictureService = require("@services/pictures/deletePicture.service");
const { HTTP_STATUS_CODES } = require("@utils/constants.util");

const handler = {
  method: "delete",
  handler: async (req, res) => {
    try {
      const data = await deletePictureService({
        pictureId: req.params.pictureId,
      });
      return res.status(HTTP_STATUS_CODES.OK).send({
        status: "completed",
        message: `Successfully deleted picture: ${req.params.pictureId}`,
        data,
      });
    } catch (error) {
      console.log("error", error);
      return res
        .status(error?.statusCode || HTTP_STATUS_CODES.BAD_REQUEST)
        .send({
          status: "error",
          message: error?.message || "Internal server error",
          data: null,
        });
    }
  },
  path: "/pictures/:pictureId",
  middlewares: [],
};

module.exports = handler;
