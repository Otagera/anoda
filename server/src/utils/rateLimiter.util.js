const { rateLimit } = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const redisClient = require("./redisClient.util");

const limiter = rateLimit({
  // Rate limiter configuration
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers

  // Redis store configuration
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  }),
});

module.exports = limiter;
