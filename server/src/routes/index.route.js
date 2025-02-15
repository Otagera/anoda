const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const handlerWrapper = require("../utils/handler.util");

const handlersFilePath = `${__dirname}${path.sep}handlers`;

const mountPaths = (handlersPath) => {
  const handlers = fs.readdirSync(handlersPath);

  for (let handler of handlers) {
    let stat = fs.lstatSync(`${handlersPath}${path.sep}${handler}`);

    if (stat.isDirectory()) {
      mountPaths(`${handlersPath}${path.sep}${handler}`);
    } else {
      const handlerObject = require(`${handlersPath}${path.sep}${handler}`);
      if (Array.isArray(handlerObject.method)) {
        handlerObject.method.forEach((method) => {
          router[method](
            handlerObject.path,
            ...handlerObject.middlewares,
            handlerWrapper(handlerObject.handler)
          );
        });
        continue;
      }
      router[handlerObject.method](
        handlerObject.path,
        ...handlerObject.middlewares,
        handlerWrapper(handlerObject.handler)
      );
    }
  }

  return router;
};

module.exports = mountPaths(handlersFilePath);
