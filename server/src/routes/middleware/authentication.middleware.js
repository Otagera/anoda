const { verify } = require("jsonwebtoken");
const { HTTP_STATUS_CODES } = require("@utils/constants.util");
const config = require("@config/index.config");
const { getUser } = require("@services/users/users.lib");

const authentication = async (req, res, next) => {
  let token = req.headers.authorization;
  if (token) {
    try {
      if (token.startsWith("Bearer ")) {
        token = token.split(" ")[1];
      }
      const { userId } = verify(token, config[config.env].secret);

      const validUser = await getUser({ user_id: userId });

      if (!validUser) {
        throw new AuthError("Invalid User");
      }

      req.userId = userId;
      return next();
    } catch (error) {
      return res
        .status(error?.statusCode || HTTP_STATUS_CODES.UNAUTHORIZED)
        .send({
          status: "error",
          message:
            error?.message ||
            "Unauthorized request, please provide a valid token.",
          data: null,
        });
    }
  } else {
    return res.status(HTTP_STATUS_CODES.UNAUTHORIZED).send({
      status: "error",
      message: "Unauthorized request, please login",
      data: null,
    });
  }
};

module.exports = authentication;
