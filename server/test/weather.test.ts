import { describe, expect, it, vi, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";

describe("weather API", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns bundle when upstream ok", async () => {
    const app = createApp();

    // Mock global fetch used in openweather client
    const fakeFetch = vi.fn(async (url: string) => {
      const u = new URL(url);
      if (u.pathname.endsWith("/weather")) {
        return {
          ok: true,
          json: async () => ({
            dt: 1,
            main: { temp: 10, feels_like: 9, humidity: 50 },
            wind: { speed: 3 },
            weather: [{ description: "clear", icon: "01d" }]
          })
        } as any;
      }
      if (u.pathname.endsWith("/forecast")) {
        return {
          ok: true,
          json: async () => ({
            list: [
              { dt: Math.floor(Date.now() / 1000) + 3600, main: { temp_min: 8, temp_max: 12 }, weather: [{ description: "clear", icon: "01d" }] }
            ]
          })
        } as any;
      }
      return { ok: false, status: 403, text: async () => "forbidden" } as any;
    });
    // @ts-expect-error test override
    global.fetch = fakeFetch;

    const res = await request(app)
      .get("/api/weather?lat=10&lon=20&units=metric")
      .expect(200);

    expect(res.body.current.temp).toBe(10);
    expect(Array.isArray(res.body.futureDays)).toBe(true);
    expect(Array.isArray(res.body.pastDays)).toBe(true);
  });
});

