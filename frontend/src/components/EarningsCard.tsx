"use client";

import { formatCurrency } from "@/lib/format";

interface Props {
  calendar: Record<string, unknown>;
}

export default function EarningsCard({ calendar }: Props) {
  if (!calendar || Object.keys(calendar).length === 0) return null;

  // Parse earnings date(s)
  const earningsDateRaw = calendar["Earnings Date"] ?? calendar["earningsDate"];
  let earningsDateStr: string | null = null;
  if (Array.isArray(earningsDateRaw) && earningsDateRaw.length > 0) {
    earningsDateStr = String(earningsDateRaw[0]);
  } else if (earningsDateRaw) {
    earningsDateStr = String(earningsDateRaw);
  }

  // Parse estimates
  const epsAvg = calendar["Earnings Average"] ?? calendar["earningsAverage"] ?? null;
  const epsHigh = calendar["Earnings High"] ?? calendar["earningsHigh"] ?? null;
  const epsLow = calendar["Earnings Low"] ?? calendar["earningsLow"] ?? null;
  const revAvg = calendar["Revenue Average"] ?? calendar["revenueAverage"] ?? null;
  const revHigh = calendar["Revenue High"] ?? calendar["revenueHigh"] ?? null;
  const revLow = calendar["Revenue Low"] ?? calendar["revenueLow"] ?? null;

  // Parse ex-dividend date
  const exDiv = calendar["Ex-Dividend Date"] ?? calendar["exDividendDate"] ?? null;

  // Format the earnings date nicely
  let dateDisplay = "TBD";
  let monthDay = "";
  if (earningsDateStr) {
    try {
      const d = new Date(earningsDateStr);
      if (!isNaN(d.getTime())) {
        const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
        const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
        dateDisplay = `${months[d.getMonth()]} ${d.getDate()}`;
        monthDay = days[d.getDay()];
      }
    } catch {
      dateDisplay = earningsDateStr.slice(0, 10);
    }
  }

  const sans  = "var(--font-sans-label), 'Helvetica Neue', sans-serif";
  const mono  = "var(--font-mono-data), 'Courier New', monospace";
  const INK   = "#1a1a1a";
  const TM    = "#888888";
  const GRY   = "#c8c8c8";
  const BLU   = "#8a8a8a";

  return (
    <div>
      <h3 className="mb-4 text-[10px] font-extrabold uppercase tracking-[0.2em]" style={{ fontFamily: sans, color: INK }}>Upcoming Earnings</h3>

      <div className="flex items-start gap-5">
        {/* Calendar date display */}
        <div className="flex flex-col items-center px-4 py-2 min-w-[72px]" style={{ border: `2px solid ${INK}` }}>
          <span className="text-xl font-bold tabular-nums" style={{ fontFamily: mono, color: INK }}>{dateDisplay}</span>
          {monthDay && <span className="text-[10px] font-bold" style={{ fontFamily: sans, color: TM }}>{monthDay}</span>}
        </div>

        {/* Estimates */}
        <div className="flex-1 space-y-1.5 text-sm" style={{ fontFamily: mono }}>
          {(epsAvg != null || epsHigh != null || epsLow != null) && (
            <div>
              <span style={{ fontFamily: sans, color: TM, fontSize: 10 }}>EPS Est.</span>{" "}
              <span style={{ color: INK, fontWeight: 700 }}>
                {epsLow != null && epsHigh != null
                  ? `$${Number(epsLow).toFixed(2)} – $${Number(epsHigh).toFixed(2)}`
                  : ""}
                {epsAvg != null && (
                  <span className="ml-1" style={{ color: TM, fontWeight: 400 }}>(avg ${Number(epsAvg).toFixed(2)})</span>
                )}
              </span>
            </div>
          )}
          {(revAvg != null || revHigh != null || revLow != null) && (
            <div>
              <span style={{ fontFamily: sans, color: TM, fontSize: 10 }}>Rev Est.</span>{" "}
              <span style={{ color: INK, fontWeight: 700 }}>
                {revLow != null && revHigh != null
                  ? `${formatCurrency(Number(revLow))} – ${formatCurrency(Number(revHigh))}`
                  : ""}
                {revAvg != null && (
                  <span className="ml-1" style={{ color: TM, fontWeight: 400 }}>(avg {formatCurrency(Number(revAvg))})</span>
                )}
              </span>
            </div>
          )}
          {exDiv != null && (
            <div>
              <span style={{ fontFamily: sans, color: TM, fontSize: 10 }}>Ex-Div Date</span>{" "}
              <span style={{ color: INK, fontWeight: 700 }}>{String(exDiv).slice(0, 10)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
