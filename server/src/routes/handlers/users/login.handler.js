const loginService = require("@services/users/login.service");
const { HTTP_STATUS_CODES } = require("@utils/constants.util");

const handler = {
  method: "post",
  handler: async (req, res) => {
    try {
      const data = await loginService(req.body);
      return res.status(HTTP_STATUS_CODES.OK).send({
        status: "completed",
        message: "User logged in successfully.",
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
  path: "/auth/login",
  middlewares: [],
};

module.exports = handler;
