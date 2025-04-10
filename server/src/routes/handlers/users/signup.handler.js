const signupService = require("@services/users/signup.service");
const { HTTP_STATUS_CODES } = require("@utils/constants.util");

const handler = {
  method: "post",
  handler: async (req, res) => {
    try {
      const data = await signupService(req.body);
      return res.status(HTTP_STATUS_CODES.CREATED).send({
        status: "completed",
        message: "User signed up successfully.",
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
  path: "/auth/signup",
  middlewares: [],
};

module.exports = handler;
