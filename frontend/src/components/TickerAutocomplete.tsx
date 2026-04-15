"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { fetchTickerList, type TickerInfo } from "@/lib/api";

const mono = "'IBM Plex Mono', 'Courier New', monospace";
const sans = "'Inter', 'Helvetica Neue', system-ui, sans-serif";
const INK = "#1a1a1a";
const WHT = "#ffffff";
const GRY = "#c8c8c8";
const BLU = "#1e4d8c";
const TM = "#888888";
const BG = "#f0ede5";

interface Props {
  onAdd: (ticker: string) => void;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  inputStyle?: React.CSSProperties;
  inputClassName?: string;
}

export default function TickerAutocomplete({ onAdd, placeholder = "Add ticker\u2026", value, onChange, inputStyle: customInputStyle, inputClassName }: Props) {
  const controlled = value !== undefined;
  const [internal, setInternal] = useState("");
  const query = controlled ? value : internal;
  const setQuery = controlled ? (v: string) => onChange?.(v) : setInternal;
  const [allTickers, setAllTickers] = useState<TickerInfo[]>([]);
  const [results, setResults] = useState<TickerInfo[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Load ticker list once
  useEffect(() => {
    fetchTickerList().then(setAllTickers).catch(() => {});
  }, []);

  // Filter on query change
  const updateResults = useCallback(
    (q: string) => {
      if (!q) { setResults([]); setOpen(false); return; }
      const upper = q.toUpperCase();
      const matches = allTickers
        .filter(
          (t) =>
            t.symbol.startsWith(upper) ||
            t.name.toUpperCase().includes(upper)
        )
        .slice(0, 12);
      // Put exact symbol-prefix matches first, then name matches
      matches.sort((a, b) => {
        const aExact = a.symbol.startsWith(upper) ? 0 : 1;
        const bExact = b.symbol.startsWith(upper) ? 0 : 1;
        if (aExact !== bExact) return aExact - bExact;
        return a.symbol.localeCompare(b.symbol);
      });
      setResults(matches);
      setOpen(matches.length > 0);
      setActiveIdx(-1);
    },
    [allTickers]
  );

  useEffect(() => { updateResults(query); }, [query, updateResults]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectTicker = (symbol: string) => {
    onAdd(symbol);
    if (!controlled) setQuery("");
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "Enter" && query.trim()) {
        selectTicker(query.trim().toUpperCase());
        e.preventDefault();
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIdx >= 0 && results[activeIdx]) {
        selectTicker(results[activeIdx].symbol);
      } else if (query.trim()) {
        selectTicker(query.trim().toUpperCase());
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (activeIdx >= 0 && listRef.current) {
      const el = listRef.current.children[activeIdx] as HTMLElement;
      el?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIdx]);

  return (
    <div ref={wrapRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value.toUpperCase())}
        onKeyDown={handleKeyDown}
        onFocus={() => query && results.length > 0 && setOpen(true)}
        placeholder={placeholder}
        className={inputClassName || "w-36 px-2 py-0.5 text-[10px] focus:outline-none"}
        style={customInputStyle || {
          fontFamily: mono,
          background: WHT,
          color: INK,
          border: `1px solid ${GRY}`,
        }}
      />

      {/* Dropdown */}
      {open && results.length > 0 && (
        <div
          ref={listRef}
          className="absolute left-0 top-full mt-0.5 z-[100] max-h-[300px] overflow-y-auto shadow-lg"
          style={{
            width: 280,
            background: WHT,
            border: `1px solid ${GRY}`,
          }}
        >
          {results.map((t, i) => (
            <div
              key={t.symbol}
              className="flex items-center gap-2 px-2.5 py-1.5 cursor-pointer transition-colors"
              style={{
                background: i === activeIdx ? `${BLU}12` : i % 2 === 0 ? WHT : BG,
                borderTop: i > 0 ? `1px solid ${GRY}20` : "none",
              }}
              onMouseEnter={() => setActiveIdx(i)}
              onClick={() => selectTicker(t.symbol)}
            >
              <span
                className="text-[11px] font-bold shrink-0"
                style={{ fontFamily: mono, color: INK, minWidth: 52 }}
              >
                {t.symbol}
              </span>
              <span
                className="text-[10px] truncate flex-1"
                style={{ fontFamily: sans, color: TM }}
              >
                {t.name}
              </span>
              <span
                className="text-[8px] uppercase tracking-wider shrink-0"
                style={{ fontFamily: sans, color: GRY }}
              >
                {t.sector?.split(" ")[0]}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
