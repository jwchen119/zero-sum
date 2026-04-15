"use client";

import Link from "next/link";

const STYLES = [
  {
    id: "01",
    slug: "style-01-bloomberg",
    name: "Bloomberg Terminal",
    subtitle: "Dark Pro",
    description: "Pure black, neon amber/green, monospace. Maximum data density for power users.",
    colors: ["#000000", "#ff8c00", "#00ff00", "#ff3333", "#00ccff"],
    ready: true,
  },
  {
    id: "02",
    slug: "style-02-nord",
    name: "Nord / Arctic Dark",
    subtitle: "Current Theme",
    description: "Muted blue-gray palette, soft frost accents. Calm and easy on the eyes.",
    colors: ["#2E3440", "#88C0D0", "#A3BE8C", "#BF616A", "#EBCB8B"],
    ready: true,
  },
  {
    id: "03",
    slug: "style-03-glass",
    name: "Glassmorphism",
    subtitle: "Frosted Glass",
    description: "Translucent cards with backdrop blur over rich gradients. Premium and modern.",
    colors: ["#1e1b4b", "#7c3aed", "#60a5fa", "#4ade80", "#f87171"],
    ready: true,
  },
  {
    id: "04",
    slug: "style-04-neobrutalism",
    name: "Neobrutalism",
    subtitle: "Bold & Raw",
    description: "Thick borders, vivid colors, hard shadows. Intentionally raw and distinctive.",
    colors: ["#fffef5", "#a388ee", "#ff6b6b", "#ffd43b", "#000000"],
    ready: true,
  },
  {
    id: "05",
    slug: "style-05-corporate",
    name: "Corporate Minimalist",
    subtitle: "Light & Clean",
    description: "White backgrounds, slate tones, indigo accents. Trustworthy and institutional.",
    colors: ["#ffffff", "#f8fafc", "#4f46e5", "#16a34a", "#dc2626"],
    ready: true,
  },
  {
    id: "06",
    slug: "style-06-luxury",
    name: "Dark Luxury",
    subtitle: "Fintech Dark",
    description: "Deep navy with gold and emerald accents. Private banking premium feel.",
    colors: ["#0a0f1a", "#111827", "#f59e0b", "#10b981", "#f43f5e"],
    ready: true,
  },
  {
    id: "07",
    slug: "style-07-cyberpunk",
    name: "Cyberpunk / Hacker",
    subtitle: "Neon on Void",
    description: "Matrix green, hot pink, electric cyan on pitch black. Sci-fi trading floor.",
    colors: ["#0d0d0d", "#00ff41", "#ff2d95", "#00e5ff", "#ffe600"],
    ready: true,
  },
  {
    id: "08",
    slug: "style-08-neumorphism",
    name: "Neumorphism",
    subtitle: "Soft UI",
    description: "Soft extruded elements with dual-direction shadows. Tactile and physical.",
    colors: ["#e0e5ec", "#a3b1c6", "#ffffff", "#667eea", "#48bb78"],
    ready: true,
  },
  {
    id: "09",
    slug: "style-09-tradingview",
    name: "TradingView",
    subtitle: "Chart Platform",
    description: "Chart-first layout, dense toolbars, split-pane panels. Professional trading UI.",
    colors: ["#131722", "#2a2e39", "#2962ff", "#26a69a", "#ef5350"],
    ready: true,
  },
  {
    id: "10",
    slug: "style-10-material",
    name: "Material Design 3",
    subtitle: "Google Finance",
    description: "Tonal surfaces, rounded corners, clear type hierarchy. Familiar and accessible.",
    colors: ["#1c1b1f", "#2b2930", "#d0bcff", "#81c784", "#ef5350"],
    ready: true,
  },
  {
    id: "11",
    slug: "style-11-aurora",
    name: "Aurora Gradient Mesh",
    subtitle: "Gradient Mesh",
    description: "Animated gradient backgrounds with glass cards floating above. Visually stunning.",
    colors: ["#1e1b4b", "#7c3aed", "#06b6d4", "#ec4899", "#000000"],
    ready: true,
  },
  {
    id: "12",
    slug: "style-12-newspaper",
    name: "Newspaper",
    subtitle: "Data Journalism",
    description: "Serif headings, column layouts, thick rules. WSJ / FT editorial authority.",
    colors: ["#faf9f6", "#1a1a1a", "#c41e3a", "#1a4d8f", "#2d6a4f"],
    ready: true,
  },
  {
    id: "08a",
    slug: "style-08a-dark-neu",
    name: "Dark Neumorphism",
    subtitle: "Soft UI — Dark",
    description: "Charcoal base with dual inner/outer shadows. Electric indigo accent. Inset badges & glowing bars.",
    colors: ["#2d2d3a", "#1e1e28", "#3c3c4e", "#818cf8", "#6ee7b7"],
    ready: true,
  },
  {
    id: "08b",
    slug: "style-08b-warm-neu",
    name: "Warm Neumorphism",
    subtitle: "Soft UI — Sand",
    description: "Warm beige base with earthy shadows. Terracotta and olive accents. Pill-shaped components.",
    colors: ["#e8dfd1", "#c4b9a8", "#a0522d", "#5d6b3e", "#d97706"],
    ready: true,
  },
  {
    id: "08c",
    slug: "style-08c-clay-neu",
    name: "Claymorphism",
    subtitle: "Clay Soft UI",
    description: "Pastel lavender base with vibrant candy accents. Concave surfaces and thick rounded corners.",
    colors: ["#e0d8f0", "#7c3aed", "#f43f5e", "#65a30d", "#0ea5e9"],
    ready: true,
  },
  {
    id: "12a",
    slug: "style-12a-victorian",
    name: "Victorian Gazette",
    subtitle: "1880s Broadsheet",
    description:
      "Aged parchment, ornamental flourishes, drop caps, multi-column broadsheet. Old-world financial gazette.",
    colors: ["#f0e6d3", "#1a1108", "#6b1d1d", "#b8860b", "#2d4a2d"],
    ready: true,
  },
  {
    id: "12b",
    slug: "style-12b-art-deco",
    name: "Art Deco Times",
    subtitle: "1920s Jazz Age",
    description:
      "Geometric precision, burnished gold on deep navy. Stepped borders, sunburst motifs, condensed type.",
    colors: ["#f5f0e0", "#1a1a3e", "#c5a55a", "#234d32", "#9b1b30"],
    ready: true,
  },
  {
    id: "12c",
    slug: "style-12c-pink-sheet",
    name: "Pink Sheet",
    subtitle: "FT-Style 1960s",
    description:
      "Salmon pink broadsheet, typewriter data, dense columns. FT and Pink Sheets era financial press.",
    colors: ["#fce4d6", "#1a1a1a", "#6b0f1a", "#1a4d2e", "#8b7355"],
    ready: true,
  },
  {
    id: "12d",
    slug: "style-12d-wsj-hedcut",
    name: "WSJ Hedcut",
    subtitle: "Stipple & Ink",
    description:
      "Almost entirely B&W, warm cream background, single blue accent. Scotch Roman serifs, stipple-dot charts, clean hairline rules.",
    colors: ["#f8f7f5", "#1a1a1a", "#1e4d8c", "#8b0000", "#ffffff"],
    ready: true,
  },
  {
    id: "12e",
    slug: "style-12e-ticker-tape",
    name: "Ticker Tape",
    subtitle: "Wire Service Teletype",
    description:
      "Yellowed teletype paper, ALL-CAPS monospaced typewriter, flash-red alerts. ASCII art masthead, dot-leader tables.",
    colors: ["#f5f0d0", "#2b2b2b", "#cc0000", "#555544", "#8a8060"],
    ready: true,
  },
  {
    id: "12f",
    slug: "style-12f-swiss-nzz",
    name: "Swiss / NZZ",
    subtitle: "Helvetica Minimalism",
    description:
      "Pure white, black text, Swiss red as sole accent. Numbered sections, strict grid, Inter/Helvetica, red period buttons.",
    colors: ["#ffffff", "#000000", "#ff0000", "#f8f8f8", "#666666"],
    ready: true,
  },
  {
    id: "12g",
    slug: "style-12g-classified",
    name: "Classified Listings",
    subtitle: "Agate Stock Tables",
    description:
      "Ultra-dense newsprint, 6-column grids, tiny 7–11px agate type. Data-maximalist stock-table aesthetic.",
    colors: ["#e8e4dc", "#1a1a1a", "#f5f2ea", "#8a7a6a", "#2d4a2d"],
    ready: true,
  },
  {
    id: "12h",
    slug: "style-12h-letterpress",
    name: "Letterpress Broadside",
    subtitle: "1850s Woodtype Posters",
    description:
      "Heavy cream stock, giant slab-serif display type, ornamental borders, ☞ manicules, mixed sizes & weights.",
    colors: ["#f2e8d0", "#1a1108", "#8b1a1a", "#2d4a2d", "#a09070"],
    ready: true,
  },
  {
    id: "12i",
    slug: "style-12i-nikkei",
    name: "Nikkei / 日経",
    subtitle: "Japanese Financial Press",
    description:
      "Clean white base, navy headers, colour-coded section bands, stamp-style badges, boxed section labels with Japanese text.",
    colors: ["#ffffff", "#003366", "#c8102e", "#1a8754", "#f5f5f0"],
    ready: true,
  },
  {
    id: "12j",
    slug: "style-12j-microfiche",
    name: "Microfiche Archive",
    subtitle: "1970s–80s Film Reader",
    description:
      "Dark blue-green CRT phosphor, cyan/amber glow, OCR monospace, scan-line overlay, film-frame borders with sprocket holes.",
    colors: ["#0a1a1f", "#7ecfc0", "#e0a040", "#0e2228", "#3a6a60"],
    ready: true,
  },
  {
    id: "13",
    slug: "style-13-saas-dashboard",
    name: "Clean SaaS Dashboard",
    subtitle: "Tailwind / shadcn",
    description:
      "Flat UI, white card-on-grey, pill tags, rounded inputs, minimal elevation. The default Tailwind UI / Linear aesthetic.",
    colors: ["#f9fafb", "#ffffff", "#3b82f6", "#10b981", "#ef4444"],
    ready: true,
  },
  {
    id: "14",
    slug: "style-14-notion",
    name: "Notion-like",
    subtitle: "Document-style UI",
    description:
      "Serif headings, toggle blocks, callouts, emoji icons, page properties, generous whitespace. Notion/Coda aesthetic.",
    colors: ["#ffffff", "#f7f6f3", "#37352f", "#6366f1", "#2eaadc"],
    ready: true,
  },
];

export default function PrototypeIndex() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-800 bg-[#0a0a0a]/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto max-w-6xl px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                <span className="text-gray-400">Zero Sum</span>{" "}
                <span className="text-white">Design Prototypes</span>
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                12 visual styles for our financial research platform — click to preview
              </p>
            </div>
            <Link
              href="/"
              className="text-sm text-gray-500 hover:text-white border border-gray-700 rounded-lg px-4 py-2 hover:border-gray-500 transition-colors"
            >
              ← Back to App
            </Link>
          </div>
        </div>
      </header>

      {/* Grid */}
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {STYLES.map((style) => {
            const cardContent = (
              <>
                {/* Color strip */}
                <div className="flex h-2">
                  {style.colors.map((c, i) => (
                    <div key={i} className="flex-1" style={{ backgroundColor: c }} />
                  ))}
                </div>

                {/* Content */}
                <div className="p-5 bg-[#111111]">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="text-xs font-mono text-gray-600">#{style.id}</span>
                      <h2 className="text-lg font-semibold text-white leading-tight">
                        {style.name}
                      </h2>
                      <span className="text-xs text-gray-500">{style.subtitle}</span>
                    </div>
                    {style.ready ? (
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full">
                        Ready
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-gray-800 text-gray-500 px-2 py-0.5 rounded-full">
                        Coming
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400 leading-relaxed">{style.description}</p>

                  {/* Color dots */}
                  <div className="flex items-center gap-2 mt-3">
                    {style.colors.map((c, i) => (
                      <div
                        key={i}
                        className="w-4 h-4 rounded-full border border-gray-700"
                        style={{ backgroundColor: c }}
                        title={c}
                      />
                    ))}
                  </div>
                </div>

                {/* Hover overlay for ready items */}
                {style.ready && (
                  <div className="absolute inset-0 bg-white/[0.02] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="bg-white/10 backdrop-blur-sm text-white text-sm font-medium px-4 py-2 rounded-lg border border-white/20">
                      View Prototype →
                    </span>
                  </div>
                )}
              </>
            );

            const classes = `group relative rounded-xl border overflow-hidden transition-all duration-200 ${
              style.ready
                ? "border-gray-700 hover:border-gray-500 hover:shadow-lg hover:shadow-white/5 cursor-pointer"
                : "border-gray-800 opacity-60 cursor-default"
            }`;

            return style.ready ? (
              <Link key={style.id} href={`/prototype/${style.slug}`} className={classes}>
                {cardContent}
              </Link>
            ) : (
              <div key={style.id} className={classes}>
                {cardContent}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-10 pt-6 border-t border-gray-800 flex items-center justify-between text-xs text-gray-600">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" /> Ready to preview
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-gray-600" /> Coming soon
            </span>
          </div>
          <span>Zero Sum — Design Style Exploration</span>
        </div>
      </main>
    </div>
  );
}
