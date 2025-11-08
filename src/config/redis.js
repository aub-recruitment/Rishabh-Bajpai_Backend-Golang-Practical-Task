const Redis = require("redis");
const logger = require("../utils/logger");

let redisClient;

const connectRedis = async () => {
  try {
    redisClient = Redis.createClient({
      url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
      password: process.env.REDIS_PASSWORD || undefined,
    });

    redisClient.on("error", (err) => {
      logger.error(`Redis Error: ${err}`);
    });

    redisClient.on("connect", () => {
      logger.info("Redis connected");
    });

    redisClient.on("ready", () => {
      logger.info("Redis ready");
    });

    redisClient.on("end", () => {
      logger.warn("Redis connection ended");
    });

    redisClient.on("reconnecting", () => {
      logger.info("Redis reconnecting");
    });

    await redisClient.connect();

    // Handle application termination
    process.on("SIGINT", async () => {
      try {
        await redisClient.quit();
        logger.info("Redis connection closed through app termination");
      } catch (err) {
        logger.error(`Error during Redis disconnection: ${err}`);
      }
    });
  } catch (error) {
    logger.error(`Error connecting to Redis: ${error.message}`);
    process.exit(1);
  }
};

const getRedisClient = () => {
  if (!redisClient) {
    throw new Error("Redis client not initialized");
  }
  return redisClient;
};

module.exports = {
  connectRedis,
  getRedisClient,
};
