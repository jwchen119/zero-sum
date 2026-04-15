"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import WSJLayout from "@/components/WSJLayout";
import { formatCurrency } from "@/lib/format";
import { WHT, INK, GRY, T2, TM, serif, mono, sans, WSJSection } from "@/lib/wsj";
import {
  fetchDividendScreener,
  type DividendEpsPoint,
  type DividendEvent,
  type DividendScreenerParams,
  type DividendScreenerResponse,
  type DividendStock,
  type DividendYearBucket,
} from "@/lib/api";
import { useWatchlist } from "@/lib/useWatchlist";

type SortField =
  | "symbol"
  | "compare"
  | "progress"
  | "h5y"
  | "priceChangePct3mVs2023"
  | "marketCap"
  | "trailingPE"
  | "beta"
  | "eps0"
  | "eps1"
  | "eps2"
  | "eps3"
  | "eps4"
  | "profitMargins";

const EMPTY = "-";
const EPS_WINDOW_YEARS = 5;
const EPS_SORT_FIELDS: SortField[] = ["eps0", "eps1", "eps2", "eps3", "eps4"];

function isFiniteNumber(val: unknown): val is number {
  return typeof val === "number" && Number.isFinite(val);
}

function fmtPct(val: number | null | undefined, digits = 2): string {
  if (!isFiniteNumber(val)) return EMPTY;
  return `${val.toFixed(digits)}%`;
}

function fmtSignedPct(val: number | null | undefined, digits = 2): string {
  if (!isFiniteNumber(val)) return EMPTY;
  const sign = val > 0 ? "+" : "";
  return `${sign}${val.toFixed(digits)}%`;
}

function fmtNum(val: number | null | undefined, digits = 1): string {
  if (!isFiniteNumber(val)) return EMPTY;
  return val.toFixed(digits);
}

function fmtDateMMDD(dateStr: string | null | undefined): string {
  if (!dateStr || dateStr.length < 10) return EMPTY;
  return dateStr.slice(5, 10);
}

function fmtDivEvent(evt: DividendEvent): string {
  const dateTxt = fmtDateMMDD(evt.date);
  const divTxt = isFiniteNumber(evt.div) ? `Cash ${evt.div.toFixed(2)}` : "Cash -";
  const pxTxt = isFiniteNumber(evt.pxPrev) ? `Prev ${evt.pxPrev.toFixed(2)}` : "Prev -";
  const yldTxt = `Yld ${fmtPct(evt.yld)}`;
  return `${dateTxt} | ${divTxt} | ${pxTxt} | ${yldTxt}`;
}

function sumEventYield(events: DividendEvent[] | null | undefined): number | null {
  if (!events || events.length === 0) return null;
  const vals = events.map((e) => e.yld).filter((v): v is number => isFiniteNumber(v));
  if (!vals.length) return null;
  const sum = vals.reduce((acc, cur) => acc + cur, 0);
  return Math.round(sum * 10000) / 10000;
}

function avgAnnualYield(h5y: DividendYearBucket[] | null | undefined): number | null {
  if (!h5y || h5y.length === 0) return null;
  const vals = h5y
    .map((y) => y.totalYld)
    .filter((v): v is number => isFiniteNumber(v));
  if (!vals.length) return null;
  const avg = vals.reduce((acc, cur) => acc + cur, 0) / vals.length;
  return Math.round(avg * 10000) / 10000;
}

function emptyBucket(year: number): DividendYearBucket {
  return { year, events: [], totalYld: null };
}

function normalizeH5y(stock: DividendStock, compareYear: number, windowYears: number): DividendYearBucket[] {
  const targetYears = Array.from({ length: windowYears }, (_, i) => compareYear - i);
  const fromApi = Array.isArray(stock.h5y) ? stock.h5y : [];
  const byYear = new Map<number, DividendYearBucket>(fromApi.map((y) => [y.year, y]));
  return targetYears.map((year) => byYear.get(year) ?? emptyBucket(year));
}

function normalizeEps5y(stock: DividendStock, compareYear: number): DividendEpsPoint[] {
  const targetYears = Array.from({ length: EPS_WINDOW_YEARS }, (_, i) => compareYear - i);
  const fromApi = Array.isArray(stock.eps5y) ? stock.eps5y : [];
  const byYear = new Map<number, number | null>();
  for (const point of fromApi) {
    if (!point || typeof point.year !== "number") continue;
    byYear.set(point.year, isFiniteNumber(point.eps) ? point.eps : null);
  }
  return targetYears.map((year) => ({ year, eps: byYear.get(year) ?? null }));
}

function getSortValue(stock: DividendStock, field: SortField, compareYear: number): number | string | null {
  if (field === "symbol") return stock.symbol ?? "";
  if (field === "compare") {
    return stock.sortKeys?.compareTotalYld ?? stock.sortKeys?.lyTotalYld ?? stock.compare?.totalYld ?? stock.ly?.totalYld ?? null;
  }
  if (field === "progress") {
    return stock.sortKeys?.progressTotalYld ?? stock.progress?.totalYld ?? sumEventYield(stock.progress?.events);
  }
  if (field === "h5y") return stock.sortKeys?.h5yAvgAnnualYld ?? avgAnnualYield(stock.h5y);
  if (field === "priceChangePct3mVs2023") return stock.priceChangePct3mVs2023 ?? null;
  if (field === "marketCap") return stock.marketCap ?? null;
  if (field === "trailingPE") return stock.trailingPE ?? null;
  if (field === "beta") return stock.beta ?? null;
  if (field.startsWith("eps")) {
    const idx = Number(field.slice(3));
    if (Number.isInteger(idx) && idx >= 0 && idx < EPS_WINDOW_YEARS) {
      return normalizeEps5y(stock, compareYear)[idx]?.eps ?? null;
    }
    return null;
  }
  if (field === "profitMargins") return stock.profitMargins ?? null;
  return null;
}

function renderYearLine(bucket: DividendYearBucket): string {
  const events = bucket.events ?? [];
  const count = events.length;
  if (!count) return `${bucket.year}: ${EMPTY}`;
  const total = fmtPct(bucket.totalYld);
  return `${bucket.year}: ${total} (${count} events)`;
}

export default function DividendsPage() {
  const [data, setData] = useState<DividendScreenerResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>("compare");
  const [sortDesc, setSortDesc] = useState(true);
  const { watchlist, toggle } = useWatchlist();

  const [minYield, setMinYield] = useState<string>("");
  const [maxYield, setMaxYield] = useState<string>("");
  const [sector, setSector] = useState<string>("");
  const [minCap, setMinCap] = useState<string>("");

  const load = useCallback(() => {
    setLoading(true);
    const params: DividendScreenerParams = {};
    if (minYield) params.minYield = parseFloat(minYield);
    if (maxYield) params.maxYield = parseFloat(maxYield);
    if (sector) params.sector = sector;
    if (minCap) params.minCap = parseFloat(minCap) * 1e9;
    fetchDividendScreener(params)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [maxYield, minCap, minYield, sector]);

  useEffect(() => {
    load();
  }, [load]);

  const anchorYear = data?.anchorYear ?? new Date().getFullYear();
  const compareYear = data?.compareYear ?? data?.lastFullYear ?? (anchorYear - 1);
  const progressYear = data?.progressYear ?? anchorYear;
  const windowYears = data?.windowYears ?? 5;
  const epsColumns = EPS_SORT_FIELDS.map((field, idx) => ({ field, year: compareYear - idx }));

  const sorted = useMemo(() => {
    const src = data?.stocks ?? [];
    return [...src].sort((a, b) => {
      const av = getSortValue(a, sortField, compareYear);
      const bv = getSortValue(b, sortField, compareYear);

      if (av == null && bv == null) return a.symbol.localeCompare(b.symbol);
      if (av == null) return 1;
      if (bv == null) return -1;

      if (typeof av === "string" && typeof bv === "string") {
        const cmp = av.localeCompare(bv);
        if (cmp !== 0) return sortDesc ? -cmp : cmp;
        return a.symbol.localeCompare(b.symbol);
      }

      const an = Number(av);
      const bn = Number(bv);
      const cmp = sortDesc ? bn - an : an - bn;
      if (cmp !== 0) return cmp;
      return a.symbol.localeCompare(b.symbol);
    });
  }, [compareYear, data?.stocks, sortDesc, sortField]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDesc((prev) => !prev);
      return;
    }
    setSortField(field);
    setSortDesc(true);
  };

  const sortMark = (field: SortField): string => {
    if (sortField !== field) return "";
    return sortDesc ? " v" : " ^";
  };

  const navContent = (
    <div className="flex items-center gap-4">
      <Link href="/" className="text-[10px] font-semibold hover:underline" style={{ fontFamily: mono, color: T2 }}>
        Home
      </Link>
    </div>
  );

  return (
    <WSJLayout navContent={navContent}>
      <WSJSection title="Dividend Screener" />

      <div className="flex flex-wrap items-end gap-3 mb-5 pb-4" style={{ borderBottom: `1px solid ${GRY}` }}>
        <div>
          <label className="block text-[8px] uppercase tracking-wider font-extrabold mb-0.5" style={{ fontFamily: sans, color: TM }}>
            Min Annual Yld % ({compareYear})
          </label>
          <input
            type="number"
            step="0.1"
            min="0"
            placeholder="0"
            className="border px-2 py-1.5 text-[12px] w-20 tabular-nums"
            style={{ borderColor: GRY, fontFamily: mono, background: WHT }}
            value={minYield}
            onChange={(e) => setMinYield(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-[8px] uppercase tracking-wider font-extrabold mb-0.5" style={{ fontFamily: sans, color: TM }}>
            Max Annual Yld % ({compareYear})
          </label>
          <input
            type="number"
            step="0.1"
            min="0"
            placeholder="20"
            className="border px-2 py-1.5 text-[12px] w-20 tabular-nums"
            style={{ borderColor: GRY, fontFamily: mono, background: WHT }}
            value={maxYield}
            onChange={(e) => setMaxYield(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-[8px] uppercase tracking-wider font-extrabold mb-0.5" style={{ fontFamily: sans, color: TM }}>
            Sector
          </label>
          <select
            className="border px-2 py-1.5 text-[12px]"
            style={{ borderColor: GRY, fontFamily: mono, background: WHT }}
            value={sector}
            onChange={(e) => setSector(e.target.value)}
          >
            <option value="">All</option>
            {data?.sectors.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[8px] uppercase tracking-wider font-extrabold mb-0.5" style={{ fontFamily: sans, color: TM }}>
            Min Cap ($B)
          </label>
          <input
            type="number"
            step="1"
            min="0"
            placeholder="0"
            className="border px-2 py-1.5 text-[12px] w-20 tabular-nums"
            style={{ borderColor: GRY, fontFamily: mono, background: WHT }}
            value={minCap}
            onChange={(e) => setMinCap(e.target.value)}
          />
        </div>
      </div>

      {!loading && data && (
        <div className="text-[10px] mb-3" style={{ fontFamily: sans, color: TM }}>
          Showing <strong style={{ color: INK }}>{sorted.length}</strong> TWSE dividend stocks (Base: {compareYear}, Progress: {progressYear})
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-24">
          <div className="text-[11px] uppercase tracking-[0.2em] animate-pulse" style={{ fontFamily: sans, color: TM }}>
            Loading dividend stocks...
          </div>
        </div>
      )}

      {!loading && sorted.length > 0 && (
        <div className="overflow-x-auto -mx-6 px-6">
          <table className="w-full table-fixed text-[12px] border-collapse" style={{ fontFamily: mono }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${INK}` }}>
                <th className="py-2 px-1 w-8 text-center text-[9px]" style={{ fontFamily: sans, color: TM }}>
                  Star
                </th>
                <th
                  className="w-56 py-2 px-2 cursor-pointer hover:underline text-[9px] uppercase tracking-wider font-extrabold text-left"
                  style={{ fontFamily: sans, color: sortField === "symbol" ? INK : TM }}
                  onClick={() => handleSort("symbol")}
                >
                  Ticker{sortMark("symbol")}
                </th>
                <th
                  className="w-[24rem] py-2 px-2 cursor-pointer hover:underline text-[9px] uppercase tracking-wider font-extrabold text-left"
                  style={{ fontFamily: sans, color: sortField === "compare" ? INK : TM }}
                  onClick={() => handleSort("compare")}
                >
                  Annual ({compareYear}){sortMark("compare")}
                </th>
                <th
                  className="w-[18rem] py-2 px-2 cursor-pointer hover:underline text-[9px] uppercase tracking-wider font-extrabold text-left"
                  style={{ fontFamily: sans, color: sortField === "progress" ? INK : TM }}
                  onClick={() => handleSort("progress")}
                >
                  Progress ({progressYear}){sortMark("progress")}
                </th>
                <th
                  className="w-[14rem] py-2 px-2 cursor-pointer hover:underline text-[9px] uppercase tracking-wider font-extrabold text-left"
                  style={{ fontFamily: sans, color: sortField === "h5y" ? INK : TM }}
                  onClick={() => handleSort("h5y")}
                >
                  {windowYears}Y Complete Hist{sortMark("h5y")}
                </th>
                <th
                  className="w-24 py-2 px-2 cursor-pointer hover:underline text-[9px] uppercase tracking-wider font-extrabold text-right"
                  style={{ fontFamily: sans, color: sortField === "priceChangePct3mVs2023" ? INK : TM }}
                  onClick={() => handleSort("priceChangePct3mVs2023")}
                >
                  3M vs 2023{sortMark("priceChangePct3mVs2023")}
                </th>
                <th
                  className="w-24 py-2 px-2 cursor-pointer hover:underline text-[9px] uppercase tracking-wider font-extrabold text-right"
                  style={{ fontFamily: sans, color: sortField === "marketCap" ? INK : TM }}
                  onClick={() => handleSort("marketCap")}
                >
                  Mkt Cap{sortMark("marketCap")}
                </th>
                <th
                  className="w-14 py-2 px-2 cursor-pointer hover:underline text-[9px] uppercase tracking-wider font-extrabold text-right"
                  style={{ fontFamily: sans, color: sortField === "trailingPE" ? INK : TM }}
                  onClick={() => handleSort("trailingPE")}
                >
                  P/E{sortMark("trailingPE")}
                </th>
                <th
                  className="w-14 py-2 px-2 cursor-pointer hover:underline text-[9px] uppercase tracking-wider font-extrabold text-right"
                  style={{ fontFamily: sans, color: sortField === "beta" ? INK : TM }}
                  onClick={() => handleSort("beta")}
                >
                  Beta{sortMark("beta")}
                </th>
                {epsColumns.map(({ field, year }) => (
                  <th
                    key={field}
                    className="w-16 py-2 px-2 cursor-pointer hover:underline text-[9px] uppercase tracking-wider font-extrabold text-right"
                    style={{ fontFamily: sans, color: sortField === field ? INK : TM }}
                    onClick={() => handleSort(field)}
                  >
                    EPS ({year}){sortMark(field)}
                  </th>
                ))}
                <th
                  className="w-16 py-2 px-2 cursor-pointer hover:underline text-[9px] uppercase tracking-wider font-extrabold text-right"
                  style={{ fontFamily: sans, color: sortField === "profitMargins" ? INK : TM }}
                  onClick={() => handleSort("profitMargins")}
                >
                  Margin{sortMark("profitMargins")}
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((stock) => {
                const compare = stock.compare ?? stock.ly ?? emptyBucket(compareYear);
                const progress = stock.progress ?? emptyBucket(progressYear);
                const compareEvents = compare.events ?? [];
                const progressEvents = progress.events ?? [];
                const compareTotal = `SUM ${fmtPct(compare.totalYld)}`;
                const progressTotal = `SUM ${fmtPct(progress.totalYld)}`;
                const compareEventsText = compareEvents.map(fmtDivEvent).join(" | ");
                const progressEventsText = progressEvents.map(fmtDivEvent).join(" | ");
                const h5yRows = normalizeH5y(stock, compareYear, windowYears);
                const epsRows = normalizeEps5y(stock, compareYear);
                const inWatchlist = watchlist.includes(stock.symbol);

                return (
                  <tr key={stock.symbol} className="hover:bg-[#f0ead8] transition-colors" style={{ borderBottom: `1px solid ${GRY}` }}>
                    <td className="py-1.5 px-1 text-center align-top">
                      <button
                        onClick={() => toggle(stock.symbol)}
                        className="transition-colors"
                        style={{ color: inWatchlist ? "#d4a017" : GRY, fontSize: 11 }}
                        title={inWatchlist ? "Remove from watchlist" : "Add to watchlist"}
                        aria-label={inWatchlist ? `Remove ${stock.symbol} from watchlist` : `Add ${stock.symbol} to watchlist`}
                      >
                        {inWatchlist ? "★" : "☆"}
                      </button>
                    </td>
                    <td className="py-1.5 px-2 text-left align-top">
                      <Link href={`/stocks/${stock.symbol}`} className="font-bold hover:underline" style={{ color: INK }}>
                        {stock.symbol}
                        <span className="ml-1.5 text-[10px] font-normal" style={{ color: TM, fontFamily: serif }}>
                          {stock.localName ?? stock.shortName ?? ""}
                        </span>
                      </Link>
                    </td>
                    <td className="py-1.5 px-2 text-left align-top">
                      {compareEvents.length ? (
                        <div className="max-w-[24rem] space-y-0.5 whitespace-normal break-all">
                          <div className="text-[11px] leading-4" style={{ color: INK }}>
                            {compareTotal}
                          </div>
                          <div className="text-[11px] leading-4" style={{ color: INK }}>
                            {compareEventsText}
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: INK }}>{EMPTY}</span>
                      )}
                    </td>
                    <td className="py-1.5 px-2 text-left align-top">
                      {progressEvents.length ? (
                        <div className="max-w-[18rem] space-y-0.5 whitespace-normal break-all">
                          <div className="text-[11px] leading-4" style={{ color: INK }}>
                            {progressTotal}
                          </div>
                          <div className="text-[11px] leading-4" style={{ color: INK }}>
                            {progressEventsText}
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: INK }}>{EMPTY}</span>
                      )}
                    </td>
                    <td className="py-1.5 px-2 text-left align-top">
                      <div className="max-w-[14rem] space-y-0.5 whitespace-normal break-words">
                        {h5yRows.map((row) => (
                          <div key={row.year} className="text-[11px] leading-4" style={{ color: INK }}>
                            {renderYearLine(row)}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td
                      className="py-1.5 px-2 text-right tabular-nums align-top"
                      style={{ color: INK }}
                      title={`Avg(2023): ${fmtNum(stock.avgClose2023, 2)} | Avg(Last 90d): ${fmtNum(stock.avgCloseLast90d, 2)}`}
                    >
                      {fmtSignedPct(stock.priceChangePct3mVs2023, 2)}
                    </td>
                    <td className="py-1.5 px-2 text-right tabular-nums align-top" style={{ color: INK }}>
                      {formatCurrency(stock.marketCap)}
                    </td>
                    <td className="py-1.5 px-2 text-right tabular-nums align-top" style={{ color: INK }}>
                      {fmtNum(stock.trailingPE)}
                    </td>
                    <td className="py-1.5 px-2 text-right tabular-nums align-top" style={{ color: INK }}>
                      {fmtNum(stock.beta, 2)}
                    </td>
                    {epsRows.map((epsPoint) => (
                      <td key={epsPoint.year} className="py-1.5 px-2 text-right tabular-nums align-top" style={{ color: INK }}>
                        {fmtNum(epsPoint.eps, 2)}
                      </td>
                    ))}
                    <td className="py-1.5 px-2 text-right tabular-nums align-top" style={{ color: INK }}>
                      {isFiniteNumber(stock.profitMargins) ? fmtPct(stock.profitMargins * 100, 1) : EMPTY}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && data && sorted.length === 0 && (
        <div className="text-center py-12 text-[11px]" style={{ fontFamily: sans, color: TM }}>
          No stocks match your filters.
        </div>
      )}
    </WSJLayout>
  );
}

