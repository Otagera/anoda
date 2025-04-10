// const moduleNameMapper = require("jest-module-name-mapper").default();

module.exports = {
  moduleNameMapper: {
    // ...moduleNameMapper,
    "^@config/(.*)$": "<rootDir>/src/config/$1",
    "^@utils/(.*)$": "<rootDir>/src/utils/$1",
    "^@models/(.*)$": "<rootDir>/src/models/$1",
    "^@routes/(.*)$": "<rootDir>/src/routes/$1",
    "^@middlewares/(.*)$": "<rootDir>/src/routes/middlewares/$1",
    "^@services/(.*)$": "<rootDir>/src/services/$1",
    "^@queue/(.*)$": "<rootDir>/src/queue/$1",
    "^@email/(.*)$": "<rootDir>/src/email/$1",
  },
  testEnvironment: "node", // if you are testing node.js
};
