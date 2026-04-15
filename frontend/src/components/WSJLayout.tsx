"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { InlineMath } from "react-katex";
import { formatMastheadDate } from "@/lib/format";
import {
  WHT, BG, INK, GRY, TM,
  serif, display, mono, sans,
  LOGOS, TAGLINES, HeavyRule,
} from "@/lib/wsj";
import { useTheme } from "@/lib/useTheme";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/screener-v4", label: "Screener" },
  { href: "/heatmap", label: "Heatmap" },
  { href: "/sectors", label: "Sectors" },
  { href: "/dividends", label: "Dividends" },
  { href: "/compare", label: "Compare" },
  { href: "/watchlist", label: "Watchlist" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/chart", label: "Chart" },
  { href: "/technical", label: "Technical" },
  { href: "/scanner", label: "Scanner" },
  { href: "/earnings", label: "Earnings" },
  { href: "/correlation", label: "Correlation" },
  { href: "/sector-analysis", label: "Sector Analysis" },
  { href: "/insiders", label: "Insiders" },
  { href: "/news", label: "News" },
  { href: "/learn", label: "Learn" },
  { href: "/about", label: "About" },
  { href: "/status", label: "Status" },
] as const;

const NAV_GROUPS = [
  { title: "Markets", links: ["/", "/screener-v4", "/heatmap", "/sectors", "/earnings"] },
  { title: "Tools", links: ["/watchlist", "/portfolio", "/compare", "/chart", "/technical", "/scanner"] },
  { title: "Research", links: ["/dividends", "/correlation", "/sector-analysis", "/insiders", "/news", "/learn"] },
  { title: "System", links: ["/about", "/status"] },
] as const;

const LINK_MAP = Object.fromEntries(NAV_LINKS.map((l) => [l.href, l.label]));

interface WSJLayoutProps {
  children: ReactNode;
  navContent?: ReactNode;
  wideContent?: boolean;
}

export default function WSJLayout({ children, navContent, wideContent }: WSJLayoutProps) {
  const [tagline, setTagline] = useState("");
  const [logo, setLogo] = useState("0∑×");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isWide, setIsWide] = useState(true);
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();

  // Unified max-width class for header + main alignment
  const mw = wideContent ? 'max-w-[1800px]' : 'max-w-[1100px] 2xl:max-w-[1800px]';

  useEffect(() => {
    setTagline(TAGLINES[Math.floor(Math.random() * TAGLINES.length)]);
    setLogo(LOGOS[Math.floor(Math.random() * LOGOS.length)]);
  }, []);

  // Track viewport width for hamburger visibility
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    setIsWide(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsWide(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const cycleTheme = () => {
    const next = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
    setTheme(next);
  };
  const themeIcon = theme === "dark" ? "☾" : theme === "system" ? "◐" : "☀";
  const themeLabel = theme === "dark" ? "Dark" : theme === "system" ? "Auto" : "Light";

  const dateStr = formatMastheadDate();

  return (
    <div className="min-h-screen flex flex-col" style={{ background: BG, color: INK }}>
      {/* ── MASTHEAD ── */}
      <header>
        <div style={{ background: WHT }}>
          <div className={`mx-auto ${mw} px-6 py-1 flex items-center justify-between`}>
            <span className="hidden sm:inline text-[9px] italic tracking-wide" style={{ fontFamily: serif, color: TM }} suppressHydrationWarning>
              &ldquo;{tagline}&rdquo;
            </span>
            <span className="flex items-center gap-3">
              <span className="hidden sm:inline text-[9px] uppercase tracking-[0.2em]" style={{ fontFamily: mono, color: TM }} suppressHydrationWarning>
                {dateStr}
              </span>
              <button
                onClick={cycleTheme}
                className="text-[9px] uppercase tracking-[0.15em] px-1.5 py-0.5 border cursor-pointer"
                style={{ fontFamily: mono, color: TM, borderColor: GRY }}
                title={`Theme: ${themeLabel}`}
              >
                {themeIcon} {themeLabel}
              </button>
            </span>
          </div>
          <div className={`mx-auto ${mw} px-6`}>
            <HeavyRule />
          </div>
          {/* ── LaTeX Equation Ticker (hidden on mobile) ── */}
          <div className={`hidden lg:block mx-auto ${mw} px-6 py-2 overflow-hidden`} style={{ background: WHT }}>
            <div className="flex items-center gap-10 text-[11px] opacity-50 animate-[scrollEqs_45s_linear_infinite] whitespace-nowrap" style={{ color: INK }}>
              <span className="flex items-center gap-1.5">
                <span className="text-[8px] font-bold uppercase tracking-[0.15em]" style={{ fontFamily: sans, color: TM }}>Minimax</span>
                <InlineMath math={"\\max_{x \\in \\Delta} \\min_{y \\in \\Delta} \\, x^\\top\\! A \\, y = v^*"} />
              </span>
              <span className="text-[8px]" style={{ color: GRY }}>§</span>
              <span className="flex items-center gap-1.5">
                <span className="text-[8px] font-bold uppercase tracking-[0.15em]" style={{ fontFamily: sans, color: TM }}>Zero-Sum</span>
                <InlineMath math={"\\textstyle\\sum_{i=1}^{n} u_i(s) = 0 \\;\\; \\forall \\, s \\in S"} />
              </span>
              <span className="text-[8px]" style={{ color: GRY }}>§</span>
              <span className="flex items-center gap-1.5">
                <span className="text-[8px] font-bold uppercase tracking-[0.15em]" style={{ fontFamily: sans, color: TM }}>Nash Eq.</span>
                <InlineMath math={"x^{*\\top}\\! A y \\geq x^{*\\top}\\! A y^* \\geq x^\\top\\! A y^*"} />
              </span>
              <span className="text-[8px]" style={{ color: GRY }}>§</span>
              <span className="flex items-center gap-1.5">
                <span className="text-[8px] font-bold uppercase tracking-[0.15em]" style={{ fontFamily: sans, color: TM }}>Expected</span>
                <InlineMath math={"\\mathbb{E}[u_1] = x^\\top\\! A \\, y"} />
              </span>
              <span className="text-[8px]" style={{ color: GRY }}>§</span>
              <span className="flex items-center gap-1.5">
                <span className="text-[8px] font-bold uppercase tracking-[0.15em]" style={{ fontFamily: sans, color: TM }}>Regret</span>
                <InlineMath math={"R_T = \\max_i \\sum_{t=1}^{T} u_i^t - \\sum_{t=1}^{T} u_{a_t}^t"} />
              </span>
              <span className="text-[8px]" style={{ color: GRY }}>§</span>
              <span className="flex items-center gap-1.5">
                <span className="text-[8px] font-bold uppercase tracking-[0.15em]" style={{ fontFamily: sans, color: TM }}>LP Dual</span>
                <InlineMath math={"\\min_{y,w} w \\;\\; \\text{s.t.} \\;\\; Ay \\leq w \\cdot \\mathbf{1}"} />
              </span>
              <span className="text-[8px]" style={{ color: GRY }}>§</span>
              <span className="flex items-center gap-1.5">
                <span className="text-[8px] font-bold uppercase tracking-[0.15em]" style={{ fontFamily: sans, color: TM }}>Payoff</span>
                <InlineMath math={"u_1(i,j) = a_{ij}, \\;\\; u_2(i,j) = -a_{ij}"} />
              </span>
              {/* duplicate set for seamless loop */}
              <span className="text-[8px]" style={{ color: GRY }}>§</span>
              <span className="flex items-center gap-1.5">
                <span className="text-[8px] font-bold uppercase tracking-[0.15em]" style={{ fontFamily: sans, color: TM }}>Minimax</span>
                <InlineMath math={"\\max_{x \\in \\Delta} \\min_{y \\in \\Delta} \\, x^\\top\\! A \\, y = v^*"} />
              </span>
              <span className="text-[8px]" style={{ color: GRY }}>§</span>
              <span className="flex items-center gap-1.5">
                <span className="text-[8px] font-bold uppercase tracking-[0.15em]" style={{ fontFamily: sans, color: TM }}>Zero-Sum</span>
                <InlineMath math={"\\textstyle\\sum_{i=1}^{n} u_i(s) = 0 \\;\\; \\forall \\, s \\in S"} />
              </span>
              <span className="text-[8px]" style={{ color: GRY }}>§</span>
              <span className="flex items-center gap-1.5">
                <span className="text-[8px] font-bold uppercase tracking-[0.15em]" style={{ fontFamily: sans, color: TM }}>Nash Eq.</span>
                <InlineMath math={"x^{*\\top}\\! A y \\geq x^{*\\top}\\! A y^* \\geq x^\\top\\! A y^*"} />
              </span>
              <span className="text-[8px]" style={{ color: GRY }}>§</span>
              <span className="flex items-center gap-1.5">
                <span className="text-[8px] font-bold uppercase tracking-[0.15em]" style={{ fontFamily: sans, color: TM }}>Expected</span>
                <InlineMath math={"\\mathbb{E}[u_1] = x^\\top\\! A \\, y"} />
              </span>
            </div>
          </div>
        </div>
        <div className={`mx-auto ${mw} px-6 pt-5 pb-3`} style={{ background: WHT }}>
          <div className="py-2">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex flex-col items-center leading-none no-underline" style={{ minWidth: "4.5rem" }}>
                <span className="text-[14px] font-bold tracking-[0.08em]" style={{ fontFamily: mono, color: GRY }} suppressHydrationWarning>
                  {logo}
                </span>
                <span
                  className="text-[7.5px] uppercase tracking-[0.18em] mt-2.5 text-center"
                  style={{ fontFamily: sans, color: TM, lineHeight: "1.5" }}
                >
                  $0 sometimes
                </span>
                <span
                  className="text-[7px] tracking-[0.15em] mt-1"
                  style={{ fontFamily: mono, color: TM, opacity: 0.5 }}
                >
                  Alpha v0.1.0
                </span>
              </Link>
              <h1 className="flex-1 text-center text-[28px] sm:text-[42px] font-normal tracking-[0.04em] leading-none" style={{ fontFamily: display, color: INK }}>
                <span className="hidden sm:inline">The </span>Zero Sum Times
              </h1>
              {/* Hamburger — mobile / tablet only */}
              {!isWide && (
                <button
                  onClick={() => setMobileOpen(true)}
                  aria-label="Open menu"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: 5,
                    width: 40,
                    height: 40,
                    flexShrink: 0,
                    background: "none",
                    border: `1px solid ${GRY}`,
                    cursor: "pointer",
                    padding: 8,
                  }}
                >
                  <span style={{ display: "block", width: 20, height: 2, background: INK, borderRadius: 1 }} />
                  <span style={{ display: "block", width: 20, height: 2, background: INK, borderRadius: 1 }} />
                  <span style={{ display: "block", width: 20, height: 2, background: INK, borderRadius: 1 }} />
                </button>
              )}
            </div>

            <div className="mt-3">
              <div className="h-px" style={{ background: INK }} />
              <div className="h-px mt-0.5" style={{ background: INK }} />
            </div>
          </div>
          {/* Global navigation — desktop */}
          {isWide && (
            <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 pb-1" style={{ borderBottom: `1px solid ${GRY}` }}>
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-[9px] font-extrabold uppercase tracking-[0.15em] hover:underline py-1"
                  style={{ fontFamily: sans, color: pathname === link.href ? INK : TM }}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          )}

          {/* ── Mobile Menu Overlay ── */}
          {mobileOpen && !isWide && (
            <div className="fixed inset-0 z-[100]" style={{ background: WHT }}>
              {/* Mobile menu header */}
              <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `2px solid ${INK}` }}>
                <Link href="/" className="no-underline" onClick={() => setMobileOpen(false)}>
                  <span className="text-[13px] font-bold tracking-[0.08em]" style={{ fontFamily: mono, color: GRY }} suppressHydrationWarning>
                    {logo}
                  </span>
                </Link>
                <div className="flex items-center gap-3">
                  <button
                    onClick={cycleTheme}
                    className="text-[9px] uppercase tracking-[0.15em] px-2 py-1 border cursor-pointer"
                    style={{ fontFamily: mono, color: TM, borderColor: GRY }}
                  >
                    {themeIcon} {themeLabel}
                  </button>
                  <button
                    onClick={() => setMobileOpen(false)}
                    className="w-9 h-9 flex items-center justify-center text-[20px] font-bold"
                    style={{ fontFamily: mono, color: INK }}
                    aria-label="Close menu"
                  >
                    ✕
                  </button>
                </div>
              </div>
              {/* Navigation grid — compact 2-column layout */}
              <div className="overflow-y-auto px-4 pt-4 pb-6" style={{ maxHeight: "calc(100vh - 56px)", WebkitOverflowScrolling: "touch" }}>
                {NAV_GROUPS.map((group) => (
                  <div key={group.title} className="mb-4">
                    <div
                      className="text-[7px] font-extrabold uppercase tracking-[0.3em] mb-1.5 pb-1"
                      style={{ fontFamily: sans, color: TM, borderBottom: `1px solid ${GRY}` }}
                    >
                      {group.title}
                    </div>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-0">
                      {group.links.map((href) => {
                        const active = pathname === href;
                        return (
                          <Link
                            key={href}
                            href={href}
                            onClick={() => setMobileOpen(false)}
                            className="flex items-center py-2.5 px-2 rounded-sm active:opacity-70"
                            style={{
                              fontFamily: sans,
                              color: active ? INK : TM,
                              fontWeight: active ? 800 : 600,
                              fontSize: 14,
                              background: active ? `${GRY}30` : "transparent",
                              borderLeft: active ? `3px solid ${INK}` : "3px solid transparent",
                            }}
                          >
                            {LINK_MAP[href]}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {/* Date at bottom */}
                <div className="mt-2 pt-3 text-center" style={{ borderTop: `1px solid ${GRY}` }}>
                  <span className="text-[8px] uppercase tracking-[0.2em]" style={{ fontFamily: mono, color: TM }} suppressHydrationWarning>
                    {dateStr}
                  </span>
                </div>
              </div>
            </div>
          )}
          {/* Page-specific navigation / Input bar */}
          {navContent && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-2">
              {navContent}
            </div>
          )}
        </div>
      </header>

      <main className={`flex-1 mx-auto w-full px-6 py-4 ${mw}`} style={{ background: WHT }}>
        {children}
      </main>

      {/* ── Footer ── */}
      <footer style={{ background: "var(--wsj-footer-bg)", borderTop: "var(--wsj-footer-border-top)" }}>
        <div className={`mx-auto ${mw} px-6 py-5`}>
          <div className="h-px mb-4" style={{ background: "var(--wsj-footer-rule)" }} />

          {/* Compact row: brand + link groups */}
          <div className="flex flex-col sm:flex-row gap-6 sm:gap-10 mb-4">
            {/* Brand */}
            <div className="shrink-0">
              <Link href="/" className="no-underline">
                <span className="text-[18px] font-bold tracking-[0.08em]" style={{ fontFamily: mono, color: "var(--wsj-footer-text)" }} suppressHydrationWarning>
                  {logo}
                </span>
              </Link>
              <p className="mt-1 text-[9px] leading-snug" style={{ fontFamily: serif, color: "var(--wsj-footer-muted)" }}>
                Free market data &amp; analysis tools.
              </p>
            </div>

            {/* Link groups — inline compact */}
            <div className="flex flex-wrap gap-x-8 gap-y-3 flex-1">
              {[
                { title: "Markets", links: [
                  { href: "/", label: "Home" }, { href: "/screener-v4", label: "Screener" },
                  { href: "/heatmap", label: "Heatmap" }, { href: "/sectors", label: "Sectors" },
                  { href: "/earnings", label: "Earnings" },
                ]},
                { title: "Tools", links: [
                  { href: "/watchlist", label: "Watchlist" },
                  { href: "/compare", label: "Compare" },
                  { href: "/chart", label: "Chart Terminal" },
                  { href: "/technical", label: "Technical" },
                ]},
                { title: "Research", links: [
                  { href: "/insiders", label: "Insiders" },
                  { href: "/dividends", label: "Dividends" },
                  { href: "/correlation", label: "Correlation" },
                ]},
              ].map((group) => (
                <div key={group.title} className="flex items-baseline gap-2">
                  <span className="text-[7px] font-extrabold uppercase tracking-[0.18em]" style={{ fontFamily: sans, color: "var(--wsj-footer-label)" }}>
                    {group.title}
                  </span>
                  <div className="flex flex-wrap gap-x-2.5 gap-y-0.5">
                    {group.links.map((l) => (
                      <Link key={l.href} href={l.href} className="text-[9px] tracking-wide hover:underline" style={{ fontFamily: sans, color: "var(--wsj-footer-muted)" }}>
                        {l.label}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="h-px mb-3" style={{ background: "var(--wsj-footer-rule2)" }} />

          {/* Bottom bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-1">
            <span className="text-[8px] uppercase tracking-[0.2em]" style={{ fontFamily: mono, color: "var(--wsj-footer-faint)" }}>
              © {new Date().getFullYear()} The Zero Sum Times
            </span>
            <span className="text-[7px] tracking-[0.15em]" style={{ fontFamily: mono, color: "var(--wsj-footer-faint)", opacity: 0.6 }}>
              Alpha v0.1.0
            </span>
            <span className="text-[8px] tracking-wide" style={{ fontFamily: serif, color: "var(--wsj-footer-faint)" }}>
              Not financial advice
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
