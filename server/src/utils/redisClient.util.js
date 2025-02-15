const RedisClient = require("ioredis");
const config = require("@config/index.config");

const redisClient = new RedisClient(config[config.env].redis_url, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  showFriendlyErrorStack: true,
});

module.exports = redisClient;
