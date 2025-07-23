import { REDIS_DEFAULTS } from "./defaults";

import { createClient } from "redis";

// Redis connection configuration
export const redisConfig = {
  host: process.env.REDISHOST,
  port: parseInt(process.env.REDISPORT || REDIS_DEFAULTS.PORT.toString(), 10),
  username: process.env.REDISUSER,
  password: process.env.REDISPASSWORD,
};

// Create Redis client
export const redisConnection = createClient({
  socket: {
    host: redisConfig.host,
    port: redisConfig.port,
  },
  username: redisConfig.username,
  password: redisConfig.password,
});

// Handle Redis connection events
redisConnection.on("connect", () => {
  console.log("✅ Redis client connected");
});

redisConnection.on("error", (err: Error) => {
  console.error("❌ Redis client error:", err);
});

redisConnection.on("end", () => {
  console.log("🛑 Redis client disconnected");
});

// Connect to Redis
redisConnection.connect().catch((err: Error) => {
  console.error("❌ Failed to connect to Redis:", err);
});
