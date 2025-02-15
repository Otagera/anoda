const { HTTP_STATUS_CODES } = require("./constants.util");

module.exports = {
  GoodResponse: (data, status_code, message) => {
    return {
      response: {
        status: "success",
        message: (data && data.message) || message,
        data,
      },
      status_code: status_code || HTTP_STATUS_CODES.OK,
    };
  },
  BadResponse: (exc, status_code, message) => {
    return {
      response: {
        status: "error",
        message: message || exc.message,
        data: exc.data || null,
      },
      status_code:
        exc.error_code || status_code || HTTP_STATUS_CODES.BAD_REQUEST,
    };
  },
};
