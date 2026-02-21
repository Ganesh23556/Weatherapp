import React from "react";
import { Navigate, Route, Routes, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import DashboardPage from "./pages/DashboardPage";

function Clock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="text-right">
      <div className="text-lg font-medium tabular-nums">
        {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>
      <div className="text-xs text-white/50 uppercase tracking-widest font-semibold">
        {time.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
      </div>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="max-w-5xl mx-auto px-4 py-6 flex items-center justify-between">
        <Link to="/" className="text-lg font-semibold tracking-tight">
          {import.meta.env.VITE_APP_NAME ?? "Weather Glass"}
        </Link>
        <Clock />
      </header>
      <main className="max-w-5xl mx-auto px-4 pb-16">{children}</main>
    </div>
  );
}

export default function App() {
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  );
}

