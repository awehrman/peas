import { REDIS_DEFAULTS } from "./defaults";

export const redisConnection = {
  host: process.env.REDISHOST,
  port: parseInt(process.env.REDISPORT || REDIS_DEFAULTS.PORT.toString(), 10),
  username: process.env.REDISUSER,
  password: process.env.REDISPASSWORD,
};
