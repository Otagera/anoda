import RedisClient from "ioredis";
import config from "../../config/src/index.config.ts";

const redisClient = new RedisClient(config[config.env].redis_url, {
	maxRetriesPerRequest: null,
	enableReadyCheck: false,
	showFriendlyErrorStack: true,
});

export default redisClient;
