import { config } from "dotenv";
import { findUpSync } from "find-up";

/**
 * Load environment variables from .env.local file
 * Uses find-up to locate the file from the monorepo root
 */
export function loadEnv(): void {
  try {
    // Find the .env.local file starting from current directory and going up
    const envPath = findUpSync(".env.local", {
      cwd: process.cwd(),
      type: "file",
    });

    if (envPath) {
      console.log(`[env] Loading environment from: ${envPath}`);
      config({ path: envPath });

      // Log key environment variables for debugging (without sensitive values)
      const envVars = {
        NODE_ENV: process.env.NODE_ENV,
        REDISHOST: process.env.REDISHOST ? "set" : "undefined",
        REDISPORT: process.env.REDISPORT,
        REDISUSERNAME: process.env.REDISUSERNAME ? "set" : "undefined",
        REDISPASSWORD: process.env.REDISPASSWORD ? "set" : "undefined",
        DATABASE_URL: process.env.DATABASE_URL ? "set" : "undefined",
      };

      console.log("[env] Environment variables loaded:", envVars);
    } else {
      console.warn("[env] No .env.local file found in parent directories");
    }
  } catch (error) {
    console.error("[env] Error loading environment variables:", error);
  }
}

// Auto-load when this module is imported
loadEnv();
