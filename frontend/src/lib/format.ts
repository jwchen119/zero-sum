export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return "N/A";
  const abs = Math.abs(value);
  if (abs >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  return `$${value.toLocaleString()}`;
}

/**
 * Auto-scale for chart axis labels — picks B/M/K based on magnitude.
 */
export function formatCurrencyAxis(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1e9) return `$${(value / 1e9).toFixed(0)}B`;
  if (abs >= 1e6) return `$${(value / 1e6).toFixed(0)}M`;
  if (abs >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
  return `$${value}`;
}

/**
 * Format a ratio (0–1) as a percentage.
 * Always expects a 0–1 decimal from the API. Use formatMarginPct for values already in %.
 */
export function formatPercent(value: number | null | undefined): string {
  if (value == null) return "N/A";
  return `${(value * 100).toFixed(1)}%`;
}

/**
 * Format a value that is already expressed in percent (e.g. margin = 47.3).
 */
export function formatMarginPct(value: number | null | undefined): string {
  if (value == null) return "N/A";
  return `${value.toFixed(1)}%`;
}

export function formatNumber(value: number | null | undefined, decimals = 2): string {
  if (value == null) return "N/A";
  return value.toFixed(decimals);
}

/**
 * Compute period-over-period growth %.
 */
export function computeGrowth(current: number | null, previous: number | null): number | null {
  if (current == null || previous == null || previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

/* ─── Date formatting ─── */

/**
 * Full masthead date: "Monday, January 6, 2025"
 */
export function formatMastheadDate(date: Date = new Date()): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Short date from ISO string: "Jan 5" or with weekday "Wed, Jan 5"
 */
export function formatShortDate(iso: string, weekday = false): string {
  const d = new Date(iso + "T12:00:00");
  const base = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (!weekday) return base;
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return `${days[d.getDay()]}, ${base}`;
}

/**
 * Convert a Date to YYYY-MM-DD string.
 */
export function toISODateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Parse a period label like "2024" or "2024-Q2" into { year, quarter? }.
 */
export function parsePeriod(label: string): { year: number; quarter?: number } {
  const qMatch = label.match(/(\d{4})-Q(\d)/);
  if (qMatch) return { year: parseInt(qMatch[1]), quarter: parseInt(qMatch[2]) };
  return { year: parseInt(label) };
}

/**
 * Find the YoY comparison index for a quarterly series.
 * For quarterly data: find same quarter from the prior year.
 * For annual data: just use i-1.
 */
export function findYoYIndex<T extends { period: string }>(
  items: T[],
  currentIndex: number,
  isQuarterly: boolean
): number | null {
  if (currentIndex <= 0) return null;
  if (!isQuarterly) return currentIndex - 1;
  const cur = parsePeriod(items[currentIndex].period);
  for (let j = currentIndex - 1; j >= 0; j--) {
    const prev = parsePeriod(items[j].period);
    if (prev.year === cur.year - 1 && prev.quarter === cur.quarter) return j;
  }
  return null; // no matching quarter found
}

/**
 * Format growth as "+12.3%" or "-4.5%"
 */
export function formatGrowth(value: number | null): string {
  if (value == null) return "";
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

/**
 * Compute a "smart" Y-axis base for bar charts so that small differences
 * between large values are visually obvious.  Returns 0 when any value is
 * non-positive or when the data range is already wide enough.
 */
export function smartYBase(values: (number | null | undefined)[]): number {
  const valid = values.filter((v): v is number => v != null && isFinite(v) && v > 0);
  if (valid.length === 0 || valid.length !== values.filter((v) => v != null).length) return 0;
  const min = Math.min(...valid);
  const max = Math.max(...valid);
  if (max === 0 || min / max < 0.6) return 0;
  const target = min * 0.8;
  const mag = Math.pow(10, Math.floor(Math.log10(target)));
  return Math.floor(target / mag) * mag;
}
