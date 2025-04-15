const authentication = require("@routes/middleware/authentication.middleware");
const fetchFacesService = require("@services/pictures/fetchFaces.service");
const { HTTP_STATUS_CODES } = require("@utils/constants.util");

const handler = {
  method: "get",
  handler: async (req, res) => {
    try {
      const imageId = req.params.imageId;
      const userId = req.userId;
      const data = await fetchFacesService({
        imageId,
        userId,
      });
      return res.status(HTTP_STATUS_CODES.OK).send({
        status: "completed",
        message: "Faces retrieved successfully.",
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
  path: "/images/:imageId/faces",
  middlewares: [authentication],
};

module.exports = handler;
