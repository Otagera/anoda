const { isObject, isString } = require("lodash");
const { HTTP_STATUS_CODES } = require("./constants.util");

const getErrorMessageFromParams = (props, defaultMessage = "") => {
  if (isString(props)) {
    return props;
  } else if (props?.message) {
    return props.message;
  }

  return defaultMessage;
};

class OperationError extends Error {
  message = "An error occurred.";

  constructor(props) {
    super();

    if (isObject(props)) {
      this.field = props.field;
      this.action = props.action;

      if (props.value) this.value = JSON.stringify(props.value);
      if (props.message) this.message = props.message;
    } else if (props) {
      this.message = props;
    }
  }
}

class InvalidRequestError extends OperationError {
  name = "InvalidRequestError";
  statusCode = HTTP_STATUS_CODES.BAD_REQUEST;

  constructor(props) {
    super(props);
    this.message = getErrorMessageFromParams(props, "Request is invalid.");
  }
}

class RateLimitError extends OperationError {
  name = "RateLimitError";
  statusCode = HTTP_STATUS_CODES.TOO_MANY_REQUESTS;

  constructor(props) {
    super(props);
    this.message = getErrorMessageFromParams(
      props,
      "Rate limit in progress, please try again later."
    );
  }
}

class NotFoundError extends OperationError {
  name = "NotFoundError";
  statusCode = HTTP_STATUS_CODES.NOTFOUND;

  constructor(props) {
    super(props);
    this.message = getErrorMessageFromParams(props, "Resource not found.");
  }
}

class ResourceInUseError extends OperationError {
  name = "ResourceInUseError";
  statusCode = HTTP_STATUS_CODES.CONFLICT;

  constructor(props) {
    super(props);
    this.message = getErrorMessageFromParams(props, "Resource is in use.");
  }
}

class AuthError extends OperationError {
  name = "AuthError";
  statusCode = HTTP_STATUS_CODES.UNAUTHORIZED;

  constructor(props) {
    super(props);
    this.message = getErrorMessageFromParams(props, "Unauthorized request.");
  }
}

class ValidationError extends OperationError {
  name = "AuthError";
  statusCode = HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY;

  constructor(props) {
    super(props);
    this.message = getErrorMessageFromParams(props, "Validation error.");
  }
}

module.exports = {
  AuthError,
  NotFoundError,
  OperationError,
  RateLimitError,
  ValidationError,
  ResourceInUseError,
  InvalidRequestError,
};
