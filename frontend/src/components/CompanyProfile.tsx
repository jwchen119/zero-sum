"use client";

import type { CompanyProfile as ProfileType, Officer } from "@/lib/api";
import { formatCurrency } from "@/lib/format";

interface Props {
  profile: ProfileType;
  officers: Officer[];
}

const serif = "var(--font-serif), 'Georgia', 'Times New Roman', serif";
const sans  = "var(--font-sans-label), 'Helvetica Neue', system-ui, sans-serif";
const mono  = "var(--font-mono-data), 'Courier New', monospace";
const INK   = "#1a1a1a";
const T2    = "#555555";
const TM    = "#888888";
const GRY   = "#c8c8c8";
const BLU   = "#8a8a8a";

export default function CompanyProfile({ profile, officers }: Props) {
  return (
    <div className="space-y-4">
      {/* Key Facts grid */}
      <div className="grid grid-cols-3 gap-y-2 gap-x-3">
        {[
          { l: "Sector", v: profile.sector || "—" },
          { l: "Industry", v: profile.industry || "—" },
          { l: "Employees", v: profile.employees ? profile.employees.toLocaleString() : "—" },
          { l: "HQ", v: [profile.city, profile.state, profile.country].filter(Boolean).join(", ") || "—" },
          ...(profile.website ? [{ l: "Web", v: profile.website.replace(/^https?:\/\/(www\.)?/, "") }] : []),
        ].map((item) => (
          <div key={item.l}>
            <span className="text-[8px] font-extrabold uppercase tracking-[0.15em]" style={{ fontFamily: sans, color: TM }}>{item.l}</span>
            {item.l === "Web" && profile.website ? (
              <div>
                <a href={profile.website} target="_blank" rel="noopener noreferrer"
                  className="text-sm font-bold hover:underline" style={{ fontFamily: mono, color: BLU }}>{item.v}</a>
              </div>
            ) : (
              <div className="text-sm font-bold" style={{ fontFamily: mono, color: INK }}>{item.v}</div>
            )}
          </div>
        ))}
      </div>

      {/* Description */}
      {profile.description && (
        <>
          <div className="h-px" style={{ background: GRY }} />
          <p className="text-[14.5px] leading-[1.7] text-justify" style={{ fontFamily: serif, color: T2 }}>
            {profile.description}
          </p>
        </>
      )}

      {/* Officers / Compensation */}
      {officers.length > 0 && (
        <>
          <div className="h-px" style={{ background: GRY }} />
          <h4 className="text-[10px] font-extrabold uppercase tracking-[0.2em]" style={{ fontFamily: sans, color: INK }}>Top Executives</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: `2px solid ${INK}` }}>
                  <th className="py-1.5 text-left text-[8px] font-extrabold uppercase tracking-[0.15em]" style={{ fontFamily: sans, color: TM }}>Name</th>
                  <th className="py-1.5 text-left text-[8px] font-extrabold uppercase tracking-[0.15em]" style={{ fontFamily: sans, color: TM }}>Title</th>
                  <th className="py-1.5 text-right text-[8px] font-extrabold uppercase tracking-[0.15em]" style={{ fontFamily: sans, color: TM }}>Total Pay</th>
                </tr>
              </thead>
              <tbody>
                {officers.map((o, i) => (
                  <tr key={i} style={{ borderTop: i > 0 ? `1px solid ${GRY}` : "none" }}>
                    <td className="py-1.5 font-bold" style={{ fontFamily: mono, color: INK }}>{o.name ?? "—"}</td>
                    <td className="py-1.5 max-w-xs truncate" style={{ fontFamily: serif, color: T2 }}>{o.title ?? "—"}</td>
                    <td className="py-1.5 text-right font-bold tabular-nums" style={{ fontFamily: mono }}>
                      {o.totalPay ? formatCurrency(o.totalPay) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
