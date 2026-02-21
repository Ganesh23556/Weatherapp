import express from "express";
import cors from "cors";

import { env } from "./lib/env.js";

import weatherRoutes from "./routes/weather.js";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: (origin, cb) => {
        // Allow non-browser tools (no Origin header)
        if (!origin) return cb(null, true);

        // In development: allow any localhost port (prevents port-conflict issues)
        if (env.NODE_ENV !== "production") {
          if (/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) return cb(null, true);
        }

        // In production: enforce configured origin
        if (env.CLIENT_ORIGIN && origin === env.CLIENT_ORIGIN) return cb(null, true);

        return cb(new Error("Not allowed by CORS"));
      },
      credentials: true
    })
  );
  app.use(express.json());


  app.get("/health", (_req, res) =>
    res.json({
      ok: true,
      env: env.NODE_ENV,
      hasWeatherKey: Boolean(env.OPENWEATHER_API_KEY && env.OPENWEATHER_API_KEY.trim().length > 0)
    })
  );


  app.use("/api/weather", weatherRoutes);

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const message = err instanceof Error ? err.message : "Server error";
    return res.status(500).json({ error: message });
  });

  return app;
}

