"use client";

import type { Ratios } from "@/lib/api";
import { formatCurrency } from "@/lib/format";

interface Props {
  ratios: Ratios;
}

export default function PriceInfoBar({ ratios }: Props) {
  const items: { label: string; value: string }[] = [
    { label: "Mkt Cap", value: formatCurrency(ratios.marketCap) },
    { label: "P/E", value: ratios.trailingPE?.toFixed(1) ?? "N/A" },
    { label: "Fwd P/E", value: ratios.forwardPE?.toFixed(1) ?? "N/A" },
    { label: "Beta", value: ratios.beta?.toFixed(2) ?? "N/A" },
    { label: "52w High", value: ratios.fiftyTwoWeekHigh ? `$${ratios.fiftyTwoWeekHigh.toFixed(2)}` : "N/A" },
    { label: "52w Low", value: ratios.fiftyTwoWeekLow ? `$${ratios.fiftyTwoWeekLow.toFixed(2)}` : "N/A" },
    { label: "Avg Vol", value: ratios.averageVolume ? `${(ratios.averageVolume / 1e6).toFixed(1)}M` : "N/A" },
    { label: "Shares", value: ratios.sharesOutstanding ? `${(ratios.sharesOutstanding / 1e9).toFixed(2)}B` : "N/A" },
  ];

  return (
    <div
      className="flex flex-wrap gap-x-5 gap-y-1 rounded-lg px-4 py-2 text-xs"
      style={{ background: "var(--wsj-white, #f5f0e8)", border: "1px solid var(--wsj-grey, #c8c8c8)" }}
    >
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <span style={{ color: "var(--wsj-muted, #888888)" }}>{item.label}:</span>
          <span className="font-medium" style={{ color: "var(--wsj-ink, #1a1a1a)" }}>{item.value}</span>
        </div>
      ))}
    </div>
  );
}
