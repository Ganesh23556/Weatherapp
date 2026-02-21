import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/api";

type CityResult = { name: string; country: string; state?: string; lat: number; lon: number };

type WeatherBundle = {
  current: {
    dt: number;
    temp: number;
    feels_like: number;
    humidity: number;
    wind_speed: number;
    description: string;
    icon: string;
  };
  pastDays: Array<{ date: string; temp_avg?: number; description?: string; icon?: string; unavailable?: boolean }>;
  futureDays: Array<{ date: string; temp_min: number; temp_max: number; description: string; icon: string }>;
};

function iconUrl(icon: string) {
  return `https://openweathermap.org/img/wn/${icon}@2x.png`;
}

export default function DashboardPage() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<CityResult[]>([]);
  const [selected, setSelected] = useState<CityResult | null>(null);
  const [bundle, setBundle] = useState<WeatherBundle | null>(null);
  const [units, setUnits] = useState<"metric" | "imperial">("metric");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [searching, setSearching] = useState(false);
  const [hint, setHint] = useState<string | null>("Type a city name to begin.");

  const unitLabel = useMemo(() => (units === "metric" ? "°C" : "°F"), [units]);

  useEffect(() => {
    let active = true;
    async function run() {
      if (q.trim().length < 2) {
        setResults([]);
        setSearching(false);
        setHint("Type at least 2 characters to search.");
        return;
      }
      setSearching(true);
      setError(null);
      setHint(null);
      try {
        const res = await apiFetch<{ results: CityResult[] }>(`/api/weather/search?q=${encodeURIComponent(q.trim())}`);
        if (active) {
          setResults(res.results);
          if (res.results.length === 0) {
            setHint("No matches found. Try adding country/state (e.g. \"Mumbai, IN\").");
          }
        }
      } catch (e) {
        if (active) setError((e as Error).message);
      } finally {
        if (active) setSearching(false);
      }
    }
    const t = setTimeout(() => void run(), 400);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [q]);

  async function loadWeather(city: CityResult) {
    setSelected(city);
    setBusy(true);
    setError(null);
    setResults([]);
    try {
      const res = await apiFetch<WeatherBundle>(
        `/api/weather?lat=${city.lat}&lon=${city.lon}&units=${units}`
      );
      setBundle(res);
    } catch (e) {
      const msg = (e as Error).message;
      setError(msg);
      setBundle(null);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (selected) void loadWeather(selected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [units]);

  // Check if historical data is actually available
  const hasHistoricalData = useMemo(() => {
    return bundle?.pastDays && bundle.pastDays.some(d => !d.unavailable);
  }, [bundle]);

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="glass p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Weather Dashboard</h1>
            <p className="text-white/60">
              Get precise forecasts and historical weather data.
            </p>
          </div>
          <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 shrink-0">
            <button
              className={`px-6 py-2 rounded-xl font-semibold transition-all ${units === "metric" ? "bg-cyan-500/20 text-cyan-100 shadow-sm" : "hover:bg-white/5 text-white/60"}`}
              onClick={() => setUnits("metric")}
            >
              Metric
            </button>
            <button
              className={`px-6 py-2 rounded-xl font-semibold transition-all ${units === "imperial" ? "bg-cyan-500/20 text-cyan-100 shadow-sm" : "hover:bg-white/5 text-white/60"}`}
              onClick={() => setUnits("imperial")}
            >
              Imperial
            </button>
          </div>
        </div>

        <div className="mt-8 relative">
          <div className="relative group">
            <input
              className="glass-input pr-12"
              placeholder="Search city (e.g. London, Mumbai, New York)…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && results.length > 0) {
                  e.preventDefault();
                  void loadWeather(results[0]);
                }
              }}
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
              {searching && (
                <div className="w-5 h-5 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
              )}
            </div>
          </div>

          {hint && !results.length && !searching && (
            <div className="mt-3 text-sm text-white/50 px-1">{hint}</div>
          )}

          {results.length > 0 && (
            <div className="absolute z-20 top-full left-0 right-0 mt-3 glass p-2 grid gap-2 shadow-2xl overflow-hidden border-white/20">
              {results.map((r) => (
                <button
                  key={`${r.lat},${r.lon}`}
                  className="w-full p-4 text-left hover:bg-white/10 rounded-2xl transition-all group flex items-center justify-between"
                  onClick={() => void loadWeather(r)}
                >
                  <div>
                    <div className="font-semibold group-hover:text-cyan-300 transition-colors">
                      {r.name}
                      {r.state ? <span className="text-white/50 font-normal">, {r.state}</span> : null}
                    </div>
                    <div className="text-xs text-white/40 uppercase tracking-widest mt-0.5">{r.country}</div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity text-cyan-300">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="mt-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-200 text-sm flex items-start gap-3">
            <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
            {error}
          </div>
        )}
      </div>

      {busy && (
        <div className="glass p-12 flex flex-col items-center justify-center gap-4 animate-pulse">
          <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
          <p className="text-cyan-100/60 font-medium">Fetching weather data...</p>
        </div>
      )}

      {bundle && !busy && (
        <div className="grid gap-8">
          <section className="glass p-8 relative overflow-hidden group">
            <div className="absolute -right-20 -top-20 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl transition-all group-hover:bg-cyan-500/20" />

            <div className="flex flex-col sm:flex-row items-center justify-between gap-8 relative z-10">
              <div className="text-center sm:text-left space-y-2">
                <div className="text-white/50 text-sm font-semibold uppercase tracking-widest">Current Weather</div>
                <div className="text-7xl font-bold tracking-tighter">
                  {Math.round(bundle.current.temp)}
                  <span className="text-cyan-400">{unitLabel}</span>
                </div>
                <div className="text-xl text-white/80 font-medium capitalize">{bundle.current.description}</div>
                <div className="pt-4 flex flex-wrap justify-center sm:justify-start gap-4">
                  <div className="glass px-4 py-2 rounded-xl text-sm border-white/5">
                    <span className="text-white/40">Feels like</span> {Math.round(bundle.current.feels_like)}{unitLabel}
                  </div>
                  <div className="glass px-4 py-2 rounded-xl text-sm border-white/5">
                    <span className="text-white/40">Humidity</span> {bundle.current.humidity}%
                  </div>
                  <div className="glass px-4 py-2 rounded-xl text-sm border-white/5">
                    <span className="text-white/40">Wind</span> {bundle.current.wind_speed}
                  </div>
                </div>
              </div>
              <div className="relative">
                <div className="absolute inset-0 bg-cyan-400/20 rounded-full blur-2xl animate-pulse" />
                <img alt="" className="w-40 h-40 relative z-10 drop-shadow-2xl" src={iconUrl(bundle.current.icon)} />
              </div>
            </div>
          </section>

          <div className="grid gap-8 lg:grid-cols-2">
            <section className="glass p-8 flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Next 5 Days</h2>
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                  <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                  </svg>
                </div>
              </div>
              <div className="space-y-4">
                {bundle.futureDays.slice(1, 6).map((d) => (
                  <div key={d.date} className="flex items-center justify-between glass p-5 hover:translate-x-1 transition-transform border-white/5">
                    <div className="space-y-1">
                      <div className="font-bold">
                        {new Date(d.date).toLocaleDateString([], { weekday: 'long' })}
                      </div>
                      <div className="text-sm text-white/50 capitalize">{d.description}</div>
                    </div>
                    <div className="flex items-center gap-6">
                      <img alt="" className="w-12 h-12" src={iconUrl(d.icon)} />
                      <div className="text-right min-w-[80px]">
                        <div className="font-bold text-lg">
                          {Math.round(d.temp_max)}° / {Math.round(d.temp_min)}°
                        </div>
                        <div className="text-[10px] text-white/40 uppercase font-black tracking-tighter">max / min</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="glass p-8 flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Historical Glance</h2>
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                  <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                  </svg>
                </div>
              </div>

              {!hasHistoricalData ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
                  <div className="p-4 rounded-full bg-white/5 border border-white/10">
                    <svg className="w-10 h-10 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white/80">Historical Data Pending</h3>
                    <p className="text-sm text-white/40 mt-1 max-w-[200px] mx-auto">
                      Historical data requires an OpenWeather One Call 3.0 subscription.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {bundle.pastDays.map((d) => (
                    <div key={d.date} className="flex items-center justify-between glass p-5 hover:translate-x-1 transition-transform border-white/5">
                      <div className="space-y-1">
                        <div className="font-bold">
                          {new Date(d.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </div>
                        <div className="text-sm text-white/50 capitalize">
                          {d.unavailable ? "Plan update required" : d.description ?? "—"}
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        {d.icon && <img alt="" className="w-12 h-12" src={iconUrl(d.icon)} />}
                        <div className="text-right min-w-[80px]">
                          <div className="font-bold text-lg">
                            {typeof d.temp_avg === "number" ? `${Math.round(d.temp_avg)}°` : "—"}
                          </div>
                          <div className="text-[10px] text-white/40 uppercase font-black tracking-tighter">avg temp</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}

