import dotenv from "dotenv";
import { z } from "zod";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Robust .env loading: prefer server/.env (works when cwd is repo root or /server)
const serverDir = fileURLToPath(new URL("../..", import.meta.url));
const envCandidates = [
  resolve(serverDir, ".env"),
  resolve(process.cwd(), "server", ".env"),
  resolve(process.cwd(), ".env")
];
for (const p of envCandidates) {
  if (existsSync(p)) {
    dotenv.config({ path: p });
    break;
  }
}

const nodeEnv = process.env.NODE_ENV ?? "development";
const isTest = nodeEnv === "test" || process.env.VITEST === "true";
const isProd = nodeEnv === "production";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(5175),
  // For production you should set an explicit origin. In dev we allow any localhost origin.
  CLIENT_ORIGIN: z.string().optional(),
  // In dev we use a safe default so the server can start.
  JWT_SECRET: isTest
    ? z.string().default("test-secret-1234567890")
    : z.string().default("dev-secret-change-me-please"),
  // Optional so auth can work even before setting weather key.
  OPENWEATHER_API_KEY: isTest ? z.string().default("test-key") : z.string().optional().default("").transform((s) => (s ?? "").trim()),
  SQLITE_PATH: z.string().default("./data/app.db")
});

export const env = EnvSchema.parse({ ...process.env, NODE_ENV: nodeEnv });

// If production and CLIENT_ORIGIN not set, fail fast.
if (isProd && !env.CLIENT_ORIGIN) {
  throw new Error("CLIENT_ORIGIN is required in production");
}

