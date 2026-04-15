"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import WSJLayout from "@/components/WSJLayout";
import {
  WHT, INK, GRY, BLU, RED, T2, TM,
  serif, mono, sans,
  Hair, HeavyRule, WSJSection,
  GAIN, LOSS,
} from "@/lib/wsj";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

/* ─── Types ─── */

interface CacheFreshness {
  exists: boolean;
  lastUpdated: string | null;
  ageSeconds: number | null;
  ageHuman: string;
}

interface JobRun {
  status: string;
  timestamp: string;
  durationSec: number;
  detail?: string;
  items?: number;
}

interface JobEntry {
  lastRun: JobRun;
  history: JobRun[];
}

interface BatchData {
  totalFiles: number;
  fresh: number;
  stale: number;
  veryStale: number;
  oldestAgeHuman: string;
  newestAgeHuman: string;
  medianAgeHuman: string;
  staleTickers: string[];
  dataQualityIssues: { ticker: string; issue: string; infoFields?: number }[];
  readErrors: { ticker: string; issue: string }[];
}

interface ListingInfo {
  exists: boolean;
  lastUpdated: string | null;
  ageHuman: string;
  count?: number;
}

interface NewsNamespaceStatus {
  totalFiles: number;
  tickers: string[];
  oldestAgeHuman: string;
  newestAgeHuman: string;
  details?: { ticker: string; ageSeconds: number; ageHuman: string; lastUpdated: string | null; stale: boolean }[];
}

interface HeatmapCacheFile {
  name: string;
  lastUpdated: string | null;
  ageSeconds: number | null;
  ageHuman: string;
  sizeKB: number | null;
}

interface HeatmapCacheStatus {
  exists: boolean;
  totalFiles: number;
  files: HeatmapCacheFile[];
  oldestAgeHuman?: string;
  newestAgeHuman?: string;
}

interface StatusData {
  health: "healthy" | "degraded" | "unhealthy";
  issues: string[];
  generatedAt: string;
  scheduler: {
    state: Record<string, unknown>;
    jobResults: Record<string, JobEntry>;
  };
  cacheFreshness: Record<string, CacheFreshness>;
  batchData: BatchData;
  listings: Record<string, ListingInfo>;
  analysis: {
    totalFiles: number;
    tickers: string[];
    details: { ticker: string; ageHours: number | null; stale: boolean; lastUpdated: string | null }[];
  };
  news?: {
    stockNews: NewsNamespaceStatus;
    newsSummary: NewsNamespaceStatus;
  };
  heatmapCache?: HeatmapCacheStatus;
  sectorAnalysisCache?: HeatmapCacheStatus;
  earningsTriggers: { ticker: string; reportedEps: number | null; earningsDate: string; triggeredAt: string }[];
}

/* ─── Helpers ─── */

const STATUS_COLORS: Record<string, string> = {
  success: GAIN,
  error: LOSS,
  skipped: TM,
};

function StatusDot({ status }: { status: string }) {
  const color = STATUS_COLORS[status] || TM;
  return (
    <span
      className="inline-block w-2 h-2 rounded-full mr-1.5"
      style={{ background: color }}
      title={status}
    />
  );
}

function HealthBadge({ health }: { health: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    healthy:  { bg: "#e8f5e9", color: GAIN,  label: "HEALTHY" },
    degraded: { bg: "#fff8e1", color: "#e65100", label: "DEGRADED" },
    unhealthy:{ bg: "#ffebee", color: LOSS,  label: "UNHEALTHY" },
  };
  const s = map[health] || map.unhealthy;
  return (
    <span
      className="inline-block px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.15em] rounded"
      style={{ background: s.bg, color: s.color, fontFamily: mono }}
    >
      {s.label}
    </span>
  );
}

function formatTimestamp(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-US", {
      month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
      hour12: false,
    });
  } catch {
    return iso;
  }
}

function FreshnessBar({ fresh, stale, veryStale, total }: { fresh: number; stale: number; veryStale: number; total: number }) {
  if (total === 0) return <span className="text-[10px]" style={{ color: TM, fontFamily: mono }}>No data</span>;
  const pFresh = (fresh / total) * 100;
  const pStale = (stale / total) * 100;
  const pVStale = (veryStale / total) * 100;
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex h-3 flex-1 overflow-hidden rounded" style={{ background: GRY }}>
        {pFresh > 0 && <div style={{ width: `${pFresh}%`, background: GAIN }} title={`Fresh: ${fresh}`} />}
        {pStale > 0 && <div style={{ width: `${pStale}%`, background: "#e65100" }} title={`Stale: ${stale}`} />}
        {pVStale > 0 && <div style={{ width: `${pVStale}%`, background: LOSS }} title={`Very stale: ${veryStale}`} />}
      </div>
      <span className="text-[10px] tabular-nums whitespace-nowrap" style={{ color: T2, fontFamily: mono }}>
        {fresh}/{total}
      </span>
    </div>
  );
}

/* ─── Page ─── */

export default function SystemStatusPage() {
  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showJobHistory, setShowJobHistory] = useState<string | null>(null);
  const [showStaleTickers, setShowStaleTickers] = useState(false);
  const [showQualityIssues, setShowQualityIssues] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/system-status`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      setError("");
      setLastRefresh(new Date());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load status");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 30s
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, [autoRefresh, load]);

  const navContent = (
    <div className="flex items-center gap-4">
      <Link href="/" className="text-[10px] font-semibold hover:underline" style={{ fontFamily: mono, color: BLU }}>Home</Link>
      <Link href="/screener-v4" className="text-[10px] font-semibold hover:underline" style={{ fontFamily: mono, color: BLU }}>Screener</Link>
    </div>
  );

  // Extract job results excluding _circuitBreaker meta key
  const jobEntries = data
    ? Object.entries(data.scheduler.jobResults).filter(([k]) => !k.startsWith("_"))
    : [];

  const circuitBreaker = data?.scheduler.jobResults._circuitBreaker as
    | { state: string; failureCount: number; timestamp: string }
    | undefined;

  return (
    <WSJLayout navContent={navContent}>
      <div className="mx-auto max-w-[1100px] px-4 py-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold sm:text-4xl" style={{ fontFamily: serif, color: INK }}>
              System Status
            </h1>
            <p className="mt-1 text-sm" style={{ color: T2, fontFamily: mono }}>
              Data pipeline observability · Download results · Cache freshness
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider border"
              style={{
                fontFamily: mono,
                borderColor: GRY,
                background: autoRefresh ? INK : "transparent",
                color: autoRefresh ? WHT : TM,
              }}
            >
              Auto-refresh {autoRefresh ? "ON" : "OFF"}
            </button>
            <button
              onClick={() => { setLoading(true); load(); }}
              className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider border"
              style={{ fontFamily: mono, borderColor: GRY, color: INK }}
            >
              Refresh Now
            </button>
          </div>
        </div>
        <HeavyRule />

        {loading && !data && (
          <div className="py-16 text-center text-[11px] uppercase tracking-[0.2em] animate-pulse" style={{ fontFamily: sans, color: TM }}>
            Loading system status…
          </div>
        )}

        {error && <p className="py-4 text-sm" style={{ color: RED, fontFamily: mono }}>{error}</p>}

        {data && (
          <>
            {/* ─── Health Overview ─── */}
            <div className="mt-6 p-4 border rounded" style={{ borderColor: GRY, background: WHT }}>
              <div className="flex flex-wrap items-center gap-4 mb-3">
                <HealthBadge health={data.health} />
                {lastRefresh && (
                  <span className="text-[10px]" style={{ color: TM, fontFamily: mono }}>
                    Updated {lastRefresh.toLocaleTimeString()}
                  </span>
                )}
                {circuitBreaker && (
                  <span
                    className="text-[10px] px-2 py-0.5 rounded border"
                    style={{
                      fontFamily: mono,
                      borderColor: circuitBreaker.state === "closed" ? GAIN : LOSS,
                      color: circuitBreaker.state === "closed" ? GAIN : LOSS,
                    }}
                  >
                    Circuit Breaker: {circuitBreaker.state.toUpperCase()}
                    {circuitBreaker.failureCount > 0 && ` (${circuitBreaker.failureCount} failures)`}
                  </span>
                )}
              </div>

              {data.issues.length > 0 && (
                <div className="space-y-1">
                  {data.issues.map((issue, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs" style={{ fontFamily: mono }}>
                      <span style={{ color: LOSS }}>⚠</span>
                      <span style={{ color: INK }}>{issue}</span>
                    </div>
                  ))}
                </div>
              )}
              {data.issues.length === 0 && (
                <p className="text-xs" style={{ color: GAIN, fontFamily: mono }}>
                  All systems operational — no issues detected.
                </p>
              )}
            </div>

            {/* ─── Scheduler Job Results ─── */}
            <WSJSection title="Scheduler Job Results" />
            <div className="overflow-x-auto">
              <table className="w-full text-left" style={{ fontFamily: mono }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${INK}` }}>
                    {["Job", "Status", "Last Run", "Duration", "Detail", "History"].map((h) => (
                      <th key={h} className="text-[9px] font-extrabold uppercase tracking-[0.12em] py-2 px-2" style={{ color: TM }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {jobEntries.map(([name, entry]) => {
                    const job = entry as JobEntry;
                    const last = job.lastRun;
                    return (
                      <tr key={name} className="hover:bg-[#f0ebe0]" style={{ borderBottom: `1px solid ${GRY}` }}>
                        <td className="py-2 px-2 text-xs font-bold" style={{ color: INK }}>
                          {name.replace("job_", "")}
                        </td>
                        <td className="py-2 px-2 text-xs">
                          <StatusDot status={last.status} />
                          <span style={{ color: STATUS_COLORS[last.status] || TM }}>{last.status}</span>
                        </td>
                        <td className="py-2 px-2 text-[11px] tabular-nums" style={{ color: T2 }}>
                          {formatTimestamp(last.timestamp)}
                        </td>
                        <td className="py-2 px-2 text-[11px] tabular-nums" style={{ color: INK }}>
                          {last.durationSec}s
                        </td>
                        <td className="py-2 px-2 text-[10px] max-w-[200px] truncate" style={{ color: last.status === "error" ? LOSS : TM }}>
                          {last.detail || "—"}
                        </td>
                        <td className="py-2 px-2">
                          <button
                            onClick={() => setShowJobHistory(showJobHistory === name ? null : name)}
                            className="text-[10px] font-bold hover:underline"
                            style={{ color: BLU, fontFamily: mono }}
                          >
                            {job.history.length} runs
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {jobEntries.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-4 text-center text-xs" style={{ color: TM }}>
                        No job results recorded yet. Scheduler may not have run.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Job history expansion */}
            {showJobHistory && data.scheduler.jobResults[showJobHistory] && (
              <div className="mt-2 mb-4 p-3 border rounded" style={{ borderColor: GRY, background: WHT }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold" style={{ fontFamily: mono, color: INK }}>
                    {showJobHistory.replace("job_", "")} — Last {(data.scheduler.jobResults[showJobHistory] as JobEntry).history.length} runs
                  </span>
                  <button
                    onClick={() => setShowJobHistory(null)}
                    className="text-[10px] font-bold hover:underline"
                    style={{ color: TM, fontFamily: mono }}
                  >
                    Close
                  </button>
                </div>
                <table className="w-full text-left" style={{ fontFamily: mono }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${GRY}` }}>
                      {["Status", "Time", "Duration", "Detail"].map((h) => (
                        <th key={h} className="text-[8px] font-extrabold uppercase tracking-[0.12em] py-1 px-2" style={{ color: TM }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(data.scheduler.jobResults[showJobHistory] as JobEntry).history.map((run, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${GRY}` }}>
                        <td className="py-1 px-2 text-[10px]">
                          <StatusDot status={run.status} />
                          <span style={{ color: STATUS_COLORS[run.status] || TM }}>{run.status}</span>
                        </td>
                        <td className="py-1 px-2 text-[10px] tabular-nums" style={{ color: T2 }}>
                          {formatTimestamp(run.timestamp)}
                        </td>
                        <td className="py-1 px-2 text-[10px] tabular-nums" style={{ color: INK }}>
                          {run.durationSec}s
                        </td>
                        <td className="py-1 px-2 text-[10px] max-w-[300px] truncate" style={{ color: run.status === "error" ? LOSS : TM }}>
                          {run.detail || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ─── Scheduler Timing ─── */}
            <WSJSection title="Scheduler Timing" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Tier 1 (Market)", key: "last_tier1", isTimestamp: true },
                { label: "Tier 2 (Intraday)", key: "last_tier2", isTimestamp: true },
                { label: "Tier 3 (Daily)", key: "last_tier3_date", isTimestamp: false },
                { label: "Tier 4 (Weekly)", key: "last_tier4_date", isTimestamp: false },
              ].map(({ label, key, isTimestamp }) => {
                const val = data.scheduler.state[key];
                let display = "Never";
                let age = "";
                if (val) {
                  if (isTimestamp && typeof val === "number") {
                    display = formatTimestamp(new Date(val * 1000).toISOString());
                    const ageS = Math.round((Date.now() / 1000) - val);
                    const m = Math.floor(ageS / 60);
                    const h = Math.floor(m / 60);
                    age = h > 0 ? `${h}h ${m % 60}m ago` : `${m}m ago`;
                  } else {
                    display = String(val);
                  }
                }
                return (
                  <div key={key} className="p-3 border rounded" style={{ borderColor: GRY, background: WHT }}>
                    <div className="text-[9px] font-extrabold uppercase tracking-[0.12em] mb-1" style={{ color: TM, fontFamily: sans }}>
                      {label}
                    </div>
                    <div className="text-sm font-bold tabular-nums" style={{ color: INK, fontFamily: mono }}>
                      {display}
                    </div>
                    {age && (
                      <div className="text-[10px] mt-0.5" style={{ color: T2, fontFamily: mono }}>
                        {age}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ─── Cache Freshness ─── */}
            <WSJSection title="Cache Freshness" />
            <div className="overflow-x-auto">
              <table className="w-full text-left" style={{ fontFamily: mono }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${INK}` }}>
                    {["Namespace", "Status", "Last Updated", "Age"].map((h) => (
                      <th key={h} className="text-[9px] font-extrabold uppercase tracking-[0.12em] py-2 px-2" style={{ color: TM }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(data.cacheFreshness).map(([ns, info]) => {
                    const ageOk = info.ageSeconds !== null && info.ageSeconds < 3600;
                    const ageWarn = info.ageSeconds !== null && info.ageSeconds >= 3600 && info.ageSeconds < 7200;
                    return (
                      <tr key={ns} className="hover:bg-[#f0ebe0]" style={{ borderBottom: `1px solid ${GRY}` }}>
                        <td className="py-2 px-2 text-xs font-bold" style={{ color: INK }}>
                          {ns.replace(/_/g, " ")}
                        </td>
                        <td className="py-2 px-2 text-xs">
                          {info.exists ? (
                            <span style={{ color: ageOk ? GAIN : ageWarn ? "#e65100" : LOSS }}>
                              {ageOk ? "● Fresh" : ageWarn ? "● Aging" : "● Stale"}
                            </span>
                          ) : (
                            <span style={{ color: LOSS }}>● Missing</span>
                          )}
                        </td>
                        <td className="py-2 px-2 text-[11px] tabular-nums" style={{ color: T2 }}>
                          {formatTimestamp(info.lastUpdated)}
                        </td>
                        <td className="py-2 px-2 text-[11px] tabular-nums" style={{ color: INK }}>
                          {info.ageHuman}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ─── Batch Data (Stock Coverage) ─── */}
            <WSJSection title="Batch Data — Stock Coverage" />
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
              {[
                { label: "Total Tickers", value: data.batchData.totalFiles, color: INK },
                { label: "Fresh (<24h)", value: data.batchData.fresh, color: GAIN },
                { label: "Stale (24-48h)", value: data.batchData.stale, color: "#e65100" },
                { label: "Very Stale (>48h)", value: data.batchData.veryStale, color: LOSS },
                { label: "Quality Issues", value: data.batchData.dataQualityIssues.length, color: data.batchData.dataQualityIssues.length > 0 ? LOSS : GAIN },
              ].map(({ label, value, color }) => (
                <div key={label} className="p-3 border rounded text-center" style={{ borderColor: GRY, background: WHT }}>
                  <div className="text-2xl font-bold tabular-nums" style={{ color, fontFamily: mono }}>
                    {value}
                  </div>
                  <div className="text-[9px] font-extrabold uppercase tracking-[0.12em] mt-1" style={{ color: TM, fontFamily: sans }}>
                    {label}
                  </div>
                </div>
              ))}
            </div>

            {/* Freshness bar */}
            <div className="mb-3">
              <div className="text-[9px] font-extrabold uppercase tracking-[0.12em] mb-1" style={{ color: TM, fontFamily: sans }}>
                Data Freshness Distribution
              </div>
              <FreshnessBar
                fresh={data.batchData.fresh}
                stale={data.batchData.stale}
                veryStale={data.batchData.veryStale}
                total={data.batchData.totalFiles}
              />
            </div>

            {/* Age range */}
            <div className="flex flex-wrap gap-4 text-[11px] mb-3" style={{ fontFamily: mono, color: T2 }}>
              <span>Newest: <strong style={{ color: INK }}>{data.batchData.newestAgeHuman}</strong></span>
              <span>Median: <strong style={{ color: INK }}>{data.batchData.medianAgeHuman}</strong></span>
              <span>Oldest: <strong style={{ color: INK }}>{data.batchData.oldestAgeHuman}</strong></span>
            </div>

            <Hair />

            {/* Stale tickers expand */}
            {data.batchData.staleTickers.length > 0 && (
              <div className="mb-3">
                <button
                  onClick={() => setShowStaleTickers(!showStaleTickers)}
                  className="text-[10px] font-bold hover:underline"
                  style={{ color: BLU, fontFamily: mono }}
                >
                  {showStaleTickers ? "Hide" : "Show"} {data.batchData.staleTickers.length} stale tickers
                </button>
                {showStaleTickers && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {data.batchData.staleTickers.map((t) => (
                      <span key={t} className="px-2 py-0.5 text-[10px] border rounded" style={{ fontFamily: mono, borderColor: GRY, color: INK }}>
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Quality issues expand */}
            {data.batchData.dataQualityIssues.length > 0 && (
              <div className="mb-3">
                <button
                  onClick={() => setShowQualityIssues(!showQualityIssues)}
                  className="text-[10px] font-bold hover:underline"
                  style={{ color: BLU, fontFamily: mono }}
                >
                  {showQualityIssues ? "Hide" : "Show"} {data.batchData.dataQualityIssues.length} quality issues
                </button>
                {showQualityIssues && (
                  <div className="mt-2 overflow-x-auto">
                    <table className="w-full text-left" style={{ fontFamily: mono }}>
                      <thead>
                        <tr style={{ borderBottom: `1px solid ${GRY}` }}>
                          {["Ticker", "Issue", "Info Fields"].map((h) => (
                            <th key={h} className="text-[8px] font-extrabold uppercase tracking-[0.12em] py-1 px-2" style={{ color: TM }}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {data.batchData.dataQualityIssues.map((q, i) => (
                          <tr key={i} style={{ borderBottom: `1px solid ${GRY}` }}>
                            <td className="py-1 px-2 text-[10px] font-bold" style={{ color: INK }}>{q.ticker}</td>
                            <td className="py-1 px-2 text-[10px]" style={{ color: LOSS }}>{q.issue}</td>
                            <td className="py-1 px-2 text-[10px] tabular-nums" style={{ color: T2 }}>
                              {q.infoFields ?? "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Read errors */}
            {data.batchData.readErrors.length > 0 && (
              <div className="mt-2 p-3 border rounded" style={{ borderColor: LOSS, background: "#ffebee" }}>
                <div className="text-[9px] font-extrabold uppercase tracking-[0.12em] mb-1" style={{ color: LOSS, fontFamily: sans }}>
                  Read Errors ({data.batchData.readErrors.length})
                </div>
                {data.batchData.readErrors.map((e, i) => (
                  <div key={i} className="text-[10px] py-0.5" style={{ fontFamily: mono, color: INK }}>
                    <strong>{e.ticker}</strong>: {e.issue}
                  </div>
                ))}
              </div>
            )}

            {/* ─── Listings ─── */}
            <WSJSection title="Stock Listings" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {Object.entries(data.listings).map(([name, info]) => (
                <div key={name} className="p-3 border rounded" style={{ borderColor: GRY, background: WHT }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold" style={{ color: INK, fontFamily: mono }}>
                      {name.replace(/_/g, " ").toUpperCase()}
                    </span>
                    <span style={{ color: info.exists ? GAIN : LOSS }}>
                      {info.exists ? "●" : "○"}
                    </span>
                  </div>
                  <div className="text-[10px]" style={{ color: T2, fontFamily: mono }}>
                    {info.exists ? (
                      <>
                        <div>{info.count ?? "?"} stocks</div>
                        <div>Updated: {info.ageHuman} ago</div>
                      </>
                    ) : (
                      <div style={{ color: LOSS }}>Missing</div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* ─── AI Analysis ─── */}
            <WSJSection title="AI Analysis Coverage" />
            <div className="p-3 border rounded" style={{ borderColor: GRY, background: WHT }}>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl font-bold tabular-nums" style={{ color: INK, fontFamily: mono }}>
                  {data.analysis.totalFiles}
                </span>
                <span className="text-[9px] font-extrabold uppercase tracking-[0.12em]" style={{ color: TM, fontFamily: sans }}>
                  Tickers with AI Analysis
                </span>
                {(data.analysis.details || []).some(d => d.stale) && (
                  <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded" style={{ background: LOSS, color: WHT, fontFamily: sans }}>
                    {data.analysis.details.filter(d => d.stale).length} stale
                  </span>
                )}
              </div>
              {(data.analysis.details || []).length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {data.analysis.details.map((d) => (
                    <Link
                      key={d.ticker}
                      href={`/stocks/${d.ticker}`}
                      className="px-2 py-0.5 text-[10px] border rounded hover:bg-[#f0ebe0]"
                      style={{
                        fontFamily: mono,
                        borderColor: d.stale ? LOSS : GRY,
                        color: d.stale ? LOSS : INK,
                        background: d.stale ? "#fff5f5" : undefined,
                      }}
                      title={d.ageHours != null ? `${d.ageHours}h old` : ""}
                    >
                      {d.ticker}
                      {d.ageHours != null && (
                        <span className="ml-1 opacity-50">{d.ageHours < 24 ? `${Math.round(d.ageHours)}h` : `${Math.round(d.ageHours / 24)}d`}</span>
                      )}
                    </Link>
                  ))}
                </div>
              ) : data.analysis.tickers.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {data.analysis.tickers.map((t) => (
                    <Link
                      key={t}
                      href={`/stocks/${t}`}
                      className="px-2 py-0.5 text-[10px] border rounded hover:bg-[#f0ebe0]"
                      style={{ fontFamily: mono, borderColor: GRY, color: INK }}
                    >
                      {t}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>

            {/* ─── News & AI Summary Cache ─── */}
            {data.news && (
              <>
                <WSJSection title="News & AI Summary Cache" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  {([
                    { key: "stockNews" as const, label: "Stock News", staleThreshold: "30m" },
                    { key: "newsSummary" as const, label: "AI News Summaries", staleThreshold: "1h" },
                  ] as const).map(({ key, label, staleThreshold }) => {
                    const ns = data.news![key];
                    const staleCount = (ns.details || []).filter(d => d.stale).length;
                    return (
                      <div key={key} className="p-3 border rounded" style={{ borderColor: GRY, background: WHT }}>
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-2xl font-bold tabular-nums" style={{ color: INK, fontFamily: mono }}>
                            {ns.totalFiles}
                          </span>
                          <div>
                            <div className="text-[9px] font-extrabold uppercase tracking-[0.12em]" style={{ color: TM, fontFamily: sans }}>
                              {label}
                            </div>
                            <div className="text-[10px]" style={{ color: T2, fontFamily: mono }}>
                              Stale threshold: {staleThreshold}
                            </div>
                          </div>
                          {staleCount > 0 && (
                            <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ml-auto" style={{ background: LOSS, color: WHT, fontFamily: sans }}>
                              {staleCount} stale
                            </span>
                          )}
                        </div>
                        {ns.totalFiles > 0 && (
                          <div className="flex flex-wrap gap-3 text-[10px] mb-2" style={{ fontFamily: mono, color: T2 }}>
                            <span>Newest: <strong style={{ color: INK }}>{ns.newestAgeHuman}</strong></span>
                            <span>Oldest: <strong style={{ color: INK }}>{ns.oldestAgeHuman}</strong></span>
                          </div>
                        )}
                        {ns.tickers.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {ns.tickers.map((t) => {
                              const detail = (ns.details || []).find(d => d.ticker === t);
                              const stale = detail?.stale ?? false;
                              return (
                                <Link
                                  key={t}
                                  href={`/stocks/${t}`}
                                  className="px-2 py-0.5 text-[10px] border rounded hover:bg-[#f0ebe0]"
                                  style={{
                                    fontFamily: mono,
                                    borderColor: stale ? LOSS : GRY,
                                    color: stale ? LOSS : INK,
                                    background: stale ? "#fff5f5" : undefined,
                                  }}
                                  title={detail ? `${detail.ageHuman} old` : ""}
                                >
                                  {t}
                                  {detail && <span className="ml-1 opacity-50">{detail.ageHuman}</span>}
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* ─── Heatmap / Bubble Disk Cache ─── */}
            {data.heatmapCache && (
              <>
                <WSJSection title="Heatmap & Bubble Precomputed Cache" />
                <div className="p-3 border rounded" style={{ borderColor: GRY, background: WHT }}>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl font-bold tabular-nums" style={{ color: INK, fontFamily: mono }}>
                      {data.heatmapCache.totalFiles}
                    </span>
                    <div>
                      <div className="text-[9px] font-extrabold uppercase tracking-[0.12em]" style={{ color: TM, fontFamily: sans }}>
                        Precomputed Responses
                      </div>
                      <div className="text-[10px]" style={{ color: T2, fontFamily: mono }}>
                        {data.heatmapCache.exists ? "Serves /heatmap & /bubble instantly" : "No disk cache"}
                      </div>
                    </div>
                    {!data.heatmapCache.exists && (
                      <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ml-auto" style={{ background: LOSS, color: WHT, fontFamily: sans }}>
                        Missing
                      </span>
                    )}
                  </div>
                  {data.heatmapCache.exists && data.heatmapCache.totalFiles > 0 && (
                    <>
                      <div className="flex flex-wrap gap-3 text-[10px] mb-3" style={{ fontFamily: mono, color: T2 }}>
                        <span>Newest: <strong style={{ color: INK }}>{data.heatmapCache.newestAgeHuman}</strong></span>
                        <span>Oldest: <strong style={{ color: INK }}>{data.heatmapCache.oldestAgeHuman}</strong></span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left" style={{ fontFamily: mono }}>
                          <thead>
                            <tr style={{ borderBottom: `2px solid ${INK}` }}>
                              {["Variant", "Status", "Last Updated", "Age", "Size"].map((h) => (
                                <th key={h} className="text-[9px] font-extrabold uppercase tracking-[0.12em] py-2 px-2" style={{ color: TM }}>
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {data.heatmapCache.files.map((f) => {
                              const ageOk = f.ageSeconds !== null && f.ageSeconds < 14400;
                              const ageWarn = f.ageSeconds !== null && f.ageSeconds >= 14400 && f.ageSeconds < 28800;
                              return (
                                <tr key={f.name} className="hover:bg-[#f0ebe0]" style={{ borderBottom: `1px solid ${GRY}` }}>
                                  <td className="py-2 px-2 text-xs font-bold" style={{ color: INK }}>
                                    {f.name.replace(/_/g, " / ")}
                                  </td>
                                  <td className="py-2 px-2 text-xs">
                                    <span style={{ color: ageOk ? GAIN : ageWarn ? "#e65100" : LOSS }}>
                                      {ageOk ? "● Fresh" : ageWarn ? "● Aging" : "● Stale"}
                                    </span>
                                  </td>
                                  <td className="py-2 px-2 text-[11px] tabular-nums" style={{ color: T2 }}>
                                    {formatTimestamp(f.lastUpdated)}
                                  </td>
                                  <td className="py-2 px-2 text-[11px] tabular-nums" style={{ color: INK }}>
                                    {f.ageHuman}
                                  </td>
                                  <td className="py-2 px-2 text-[11px] tabular-nums" style={{ color: T2 }}>
                                    {f.sizeKB != null ? `${f.sizeKB.toLocaleString()} KB` : "—"}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}

            {/* ─── Sector Analysis Disk Cache ─── */}
            {data.sectorAnalysisCache && (
              <>
                <WSJSection title="Sector Analysis Precomputed Cache" />
                <div className="p-3 border rounded" style={{ borderColor: GRY, background: WHT }}>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl font-bold tabular-nums" style={{ color: INK, fontFamily: mono }}>
                      {data.sectorAnalysisCache.totalFiles}
                    </span>
                    <div>
                      <div className="text-[9px] font-extrabold uppercase tracking-[0.12em]" style={{ color: TM, fontFamily: sans }}>
                        Precomputed Responses
                      </div>
                      <div className="text-[10px]" style={{ color: T2, fontFamily: mono }}>
                        {data.sectorAnalysisCache.exists ? "Serves /sector-analysis instantly" : "No disk cache"}
                      </div>
                    </div>
                    {!data.sectorAnalysisCache.exists && (
                      <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ml-auto" style={{ background: LOSS, color: WHT, fontFamily: sans }}>
                        Missing
                      </span>
                    )}
                  </div>
                  {data.sectorAnalysisCache.exists && data.sectorAnalysisCache.totalFiles > 0 && (
                    <>
                      <div className="flex flex-wrap gap-3 text-[10px] mb-3" style={{ fontFamily: mono, color: T2 }}>
                        <span>Newest: <strong style={{ color: INK }}>{data.sectorAnalysisCache.newestAgeHuman}</strong></span>
                        <span>Oldest: <strong style={{ color: INK }}>{data.sectorAnalysisCache.oldestAgeHuman}</strong></span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left" style={{ fontFamily: mono }}>
                          <thead>
                            <tr style={{ borderBottom: `2px solid ${INK}` }}>
                              {["Variant", "Status", "Last Updated", "Age", "Size"].map((h) => (
                                <th key={h} className="text-[9px] font-extrabold uppercase tracking-[0.12em] py-2 px-2" style={{ color: TM }}>
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {data.sectorAnalysisCache.files.map((f) => {
                              const ageOk = f.ageSeconds !== null && f.ageSeconds < 14400;
                              const ageWarn = f.ageSeconds !== null && f.ageSeconds >= 14400 && f.ageSeconds < 28800;
                              return (
                                <tr key={f.name} className="hover:bg-[#f0ebe0]" style={{ borderBottom: `1px solid ${GRY}` }}>
                                  <td className="py-2 px-2 text-xs font-bold" style={{ color: INK }}>
                                    {f.name.replace(/_/g, " / ")}
                                  </td>
                                  <td className="py-2 px-2 text-xs">
                                    <span style={{ color: ageOk ? GAIN : ageWarn ? "#e65100" : LOSS }}>
                                      {ageOk ? "● Fresh" : ageWarn ? "● Aging" : "● Stale"}
                                    </span>
                                  </td>
                                  <td className="py-2 px-2 text-[11px] tabular-nums" style={{ color: T2 }}>
                                    {formatTimestamp(f.lastUpdated)}
                                  </td>
                                  <td className="py-2 px-2 text-[11px] tabular-nums" style={{ color: INK }}>
                                    {f.ageHuman}
                                  </td>
                                  <td className="py-2 px-2 text-[11px] tabular-nums" style={{ color: T2 }}>
                                    {f.sizeKB != null ? `${f.sizeKB.toLocaleString()} KB` : "—"}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}

            {/* ─── Earnings Triggers ─── */}
            {data.earningsTriggers && data.earningsTriggers.length > 0 && (
              <>
                <WSJSection title="Recent Earnings Triggers" />
                <div className="p-3 border rounded" style={{ borderColor: GRY, background: WHT }}>
                  <p className="text-[10px] mb-2" style={{ color: TM, fontFamily: sans }}>
                    AI analysis was automatically regenerated after these earnings reports
                  </p>
                  <table className="w-full text-[11px]" style={{ fontFamily: mono }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${GRY}` }}>
                        <th className="text-left py-1 font-semibold" style={{ color: TM, fontFamily: sans }}>Ticker</th>
                        <th className="text-left py-1 font-semibold" style={{ color: TM, fontFamily: sans }}>Reported EPS</th>
                        <th className="text-left py-1 font-semibold" style={{ color: TM, fontFamily: sans }}>Earnings Date</th>
                        <th className="text-left py-1 font-semibold" style={{ color: TM, fontFamily: sans }}>Triggered</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.earningsTriggers.slice(0, 20).map((t, i) => (
                        <tr key={i} style={{ borderBottom: `1px solid ${GRY}22` }}>
                          <td className="py-1">
                            <Link href={`/stocks/${t.ticker}`} style={{ color: BLU }}>{t.ticker}</Link>
                          </td>
                          <td className="py-1" style={{ color: INK }}>{t.reportedEps != null ? t.reportedEps.toFixed(2) : "—"}</td>
                          <td className="py-1" style={{ color: TM }}>{t.earningsDate.split("T")[0]}</td>
                          <td className="py-1" style={{ color: TM }}>{new Date(t.triggeredAt).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </WSJLayout>
  );
}
