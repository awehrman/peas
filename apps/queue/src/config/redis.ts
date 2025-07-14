export const redisConnection = {
  host: process.env.REDISHOST,
  port: parseInt(process.env.REDISPORT || "6379", 10),
  username: process.env.REDISUSER,
  password: process.env.REDISPASSWORD,
};

// Debug logging for Redis configuration
console.log("[redis] Redis configuration:", {
  host: redisConnection.host,
  port: redisConnection.port,
  username: redisConnection.username ? "set" : "undefined",
  password: redisConnection.password ? "set" : "undefined",
});
