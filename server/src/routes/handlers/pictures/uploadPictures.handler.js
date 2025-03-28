const upload = require("@routes/middleware/multer.middleware");
const uploadPicturesService = require("@services/pictures/uploadPictures.service");
const { HTTP_STATUS_CODES } = require("@utils/constants.util");

const handler = {
  method: "post",
  handler: async (req, res) => {
    try {
      const data = await uploadPicturesService({
        ...req.body,
        files: req.files,
      });
      return res.status(HTTP_STATUS_CODES.OK).send({
        status: "completed",
        message: "Image uploaded and face processing initiated",
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
  path: "/upload",
  middlewares: [upload.array("uploadedImages", 10)],
};

module.exports = handler;
