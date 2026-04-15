"use client";

import React from "react";
import type { AiAnalysis } from "@/lib/api";

/* ─── design tokens ─── */
const serif   = "var(--font-serif), 'Georgia', 'Times New Roman', serif";
const sans    = "var(--font-sans-label), 'Helvetica Neue', system-ui, sans-serif";
const mono    = "var(--font-mono-data), 'Courier New', monospace";
const INK     = "#1a1a1a";
const T2      = "#555555";
const TM      = "#888888";
const GRY     = "#c8c8c8";
const GR2     = "#d8d0c4";
const BLU     = "#8a8a8a";
const RED     = "#b07050";
const GRN     = "#c9a96e";

/* ─── helpers ─── */

function SectionHead({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[10px] font-extrabold uppercase tracking-[0.2em] mb-2"
          style={{ fontFamily: sans, color: INK }}>{children}</h3>
      <div className="h-0.5 mb-3" style={{ background: INK }} />
    </div>
  );
}

function Hair() {
  return <div className="h-px my-4" style={{ background: GRY }} />;
}

/* ─── main component ─── */

export default function AiAnalysisPanel({ analysis }: { analysis: AiAnalysis }) {
  const [showSources, setShowSources] = React.useState(false);

  return (
    <div className="space-y-5">
      {/* Byline */}
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <div>
          <p className="text-xs" style={{ fontFamily: sans, color: TM }}>
            {analysis.companyName} &middot; {analysis.generatedAt}
          </p>
          <p className="text-[9px] italic" style={{ fontFamily: mono, color: TM }}>
            Model: {analysis.model} &mdash; LLM Generated
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSources(!showSources)}
            className="text-[9px] font-bold uppercase tracking-[0.15em] px-2 py-0.5 transition-colors"
            style={{ fontFamily: sans, color: TM, border: `1px solid ${GRY}` }}
          >
            {showSources ? "Hide" : "Show"} Sources
          </button>
          <span className="text-[9px] font-bold uppercase tracking-[0.1em] px-1.5 py-0.5"
                style={{ fontFamily: mono, color: TM, border: `1px solid ${GRY}` }}>Prototype</span>
        </div>
      </div>

      {/* Collapsible source-data info */}
      {showSources && (
        <div className="p-4 space-y-3" style={{ border: `1px solid ${GRY}`, background: "#faf9f7" }}>
          <h3 className="text-[9px] font-extrabold uppercase tracking-[0.2em]" style={{ fontFamily: sans, color: INK }}>
            Data Fed to LLM
          </h3>
          <p className="text-xs leading-relaxed" style={{ fontFamily: serif, color: T2 }}>
            The following Yahoo Finance data was provided in a single prompt.
            The model does <strong style={{ color: INK }}>not</strong> have live access.
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 text-[11px]">
            {[
              { label: "Income Statement", desc: "Revenue, gross profit, operating income, net income, EPS" },
              { label: "Balance Sheet", desc: "Assets, liabilities, equity, debt, cash, retained earnings" },
              { label: "Cash Flow", desc: "Operating/investing/financing CF, FCF, capex, buybacks" },
              { label: "Key Ratios", desc: "P/E, margins, ROE, ROA, D/E, current ratio, beta" },
              { label: "Holders", desc: "Top 10 institutional holders, insider %, position changes" },
              { label: "Analyst Recs", desc: "Consensus buy/hold/sell counts, upcoming earnings" },
            ].map((src) => (
              <div key={src.label} className="p-2" style={{ borderTop: `1px solid ${GRY}` }}>
                <span className="font-bold text-[10px]" style={{ fontFamily: sans, color: INK }}>{src.label}</span>
                <p className="text-[10px] leading-snug mt-0.5" style={{ fontFamily: serif, color: TM }}>{src.desc}</p>
              </div>
            ))}
          </div>
          <p className="text-[9px] italic" style={{ fontFamily: serif, color: TM }}>
            All charts and tables on this page are rendered from live Yahoo Finance data. Only this section contains LLM text.
          </p>
        </div>
      )}

      {/* Plain English Summary */}
      <div>
        <SectionHead>Summary</SectionHead>
        <p className="text-[14.5px] leading-[1.7] text-justify" style={{ fontFamily: serif, color: T2 }}>
          {analysis.plainEnglish}
        </p>
      </div>

      <Hair />

      {/* Going Well + Concerns — newspaper two-column */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
        {/* Bull column */}
        <div className="pr-4 lg:border-r" style={{ borderColor: GRY }}>
          <SectionHead>Strengths &amp; Tailwinds</SectionHead>
          <ul className="space-y-3">
            {analysis.goingWell.map((pt, i) => (
              <li key={i}>
                <p className="text-sm font-bold" style={{ fontFamily: serif, color: GRN }}>{pt.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-justify" style={{ fontFamily: serif, color: T2 }}>{pt.detail}</p>
              </li>
            ))}
          </ul>
        </div>
        {/* Bear column */}
        <div className="pl-0 lg:pl-4 mt-4 lg:mt-0">
          <SectionHead>Risks &amp; Headwinds</SectionHead>
          <ul className="space-y-3">
            {analysis.concerns.map((pt, i) => (
              <li key={i}>
                <p className="text-sm font-bold" style={{ fontFamily: serif, color: RED }}>{pt.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-justify" style={{ fontFamily: serif, color: T2 }}>{pt.detail}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <Hair />

      {/* 5-Year Trend Analysis */}
      <div>
        <SectionHead>Multi-Year Trend Analysis</SectionHead>
        <p className="text-sm leading-[1.7] text-justify mb-4" style={{ fontFamily: serif, color: T2 }}>
          {analysis.fiveYearTrend.summary}
        </p>

        <div className="grid grid-cols-2 gap-0">
          <div className="pr-4 border-r" style={{ borderColor: GRY }}>
            <h4 className="text-[9px] font-extrabold uppercase tracking-[0.15em] mb-2" style={{ fontFamily: sans, color: GRN }}>
              Strengths
            </h4>
            <ul className="space-y-1.5">
              {analysis.fiveYearTrend.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs" style={{ fontFamily: serif, color: T2 }}>
                  <span style={{ color: GRN }} className="mt-0.5">&#9650;</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="pl-4">
            <h4 className="text-[9px] font-extrabold uppercase tracking-[0.15em] mb-2" style={{ fontFamily: sans, color: RED }}>
              Risks
            </h4>
            <ul className="space-y-1.5">
              {analysis.fiveYearTrend.risks.map((r, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs" style={{ fontFamily: serif, color: T2 }}>
                  <span style={{ color: RED }} className="mt-0.5">&#9660;</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-4 px-4 py-3" style={{ borderTop: `2px solid ${INK}`, background: "#faf9f7" }}>
          <h4 className="text-[9px] font-extrabold uppercase tracking-[0.15em] mb-1" style={{ fontFamily: sans, color: INK }}>
            Outlook
          </h4>
          <p className="text-xs leading-relaxed" style={{ fontFamily: serif, color: T2 }}>
            {analysis.fiveYearTrend.outlook}
          </p>
        </div>
      </div>

      <Hair />

      {/* Investment Thesis — Bull vs Bear */}
      <div>
        <SectionHead>Investment Thesis</SectionHead>
        <div className="grid grid-cols-2 gap-0">
          <div className="pr-4 border-r" style={{ borderColor: GRY }}>
            <h4 className="text-[9px] font-extrabold uppercase tracking-[0.15em] mb-2" style={{ fontFamily: sans, color: GRN }}>
              Bull Case
            </h4>
            <ul className="space-y-1.5">
              {analysis.investmentThesis.bullCase.map((pt, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs" style={{ fontFamily: serif, color: T2 }}>
                  <span style={{ color: GRN }} className="mt-0.5 shrink-0 font-bold">+</span>
                  <span>{pt}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="pl-4">
            <h4 className="text-[9px] font-extrabold uppercase tracking-[0.15em] mb-2" style={{ fontFamily: sans, color: RED }}>
              Bear Case
            </h4>
            <ul className="space-y-1.5">
              {analysis.investmentThesis.bearCase.map((pt, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs" style={{ fontFamily: serif, color: T2 }}>
                  <span style={{ color: RED }} className="mt-0.5 shrink-0 font-bold">&minus;</span>
                  <span>{pt}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <p className="text-center text-[9px] italic pt-2" style={{ fontFamily: serif, color: TM }}>
        AI-generated analysis is for informational purposes only and does not constitute financial advice.
      </p>
    </div>
  );
}
