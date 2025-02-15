/**
 * Returns a decorator function that caters for the event of a controller function failing from an uncaught exception
 * @param {function} controllerHandler - The function that handles the HTTP request
 * @returns {function} controllerHandler - Modified version of controller handler function that catches uncaught exceptions
 */
const controllerWrapper = (controllerHandler) => {
  return function (...args) {
    return controllerHandler(...args).catch(args[2]);
  };
};

module.exports = controllerWrapper;
