import { Router } from "express";
import { z } from "zod";

import { getWeatherBundle, searchCity } from "../weather/openweather.js";

const router = Router();

router.get("/search", async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  if (q.length < 2) return res.json({ results: [] });
  try {
    const results = await searchCity(q);
    return res.json({ results });
  } catch (e) {
    return res.status(502).json({ error: (e as Error).message });
  }
});

router.get("/", async (req, res) => {
  const QuerySchema = z.object({
    lat: z.coerce.number(),
    lon: z.coerce.number(),
    units: z.enum(["metric", "imperial"]).default("metric")
  });
  const parsed = QuerySchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: "Invalid query" });

  try {
    const data = await getWeatherBundle(parsed.data);
    return res.json(data);
  } catch (e) {
    return res.status(502).json({ error: (e as Error).message });
  }
});

export default router;

