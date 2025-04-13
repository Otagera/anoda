const authentication = require("@routes/middleware/authentication.middleware");
const upload = require("@routes/middleware/multer.middleware");
const uploadPicturesService = require("@services/pictures/uploadPictures.service");
const {
  HTTP_STATUS_CODES,
  MAXIMUM_IMAGES_CAN_UPLOAD,
} = require("@utils/constants.util");

const handler = {
  method: "post",
  handler: async (req, res) => {
    try {
      const data = await uploadPicturesService({
        ...req.body,
        userId: req.userId,
        files: req.files,
      });
      return res.status(HTTP_STATUS_CODES.CREATED).send({
        status: "completed",
        message: "Image uploaded and face processing initiated.",
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
  middlewares: [
    authentication,
    upload.array("uploadedImages", MAXIMUM_IMAGES_CAN_UPLOAD),
  ],
};

module.exports = handler;
