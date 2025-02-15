const now = Date.now();
const dotenv = require("dotenv");
dotenv.config();

const logger = require("@utils/logger.util");
const config = require("@config/index.config");
const { app } = require("./app");

app.listen(config[config.env].port, function () {
  logger.info(
    {
      msg: `Server started on port ${config[config.env].port}`,
      duration: `${(Date.now() - now) / 1000}s`,
    },
    "SERVER_START"
  );
});
