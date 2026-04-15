export default function StockLoading() {
  return (
    <div className="min-h-screen" style={{ background: "var(--wsj-white, #f5f0e8)" }}>
      <div className="max-w-[1400px] mx-auto px-4 py-6 animate-pulse">
        {/* Header skeleton */}
        <div className="py-5" style={{ borderBottom: "2px solid var(--wsj-ink, #1a1a1a)" }}>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <div className="h-10 w-32 rounded mb-2" style={{ background: "var(--wsj-grey-light, #d5d0c4)" }} />
              <div className="h-4 w-64 rounded" style={{ background: "var(--wsj-grey-light, #d5d0c4)" }} />
            </div>
            <div className="h-12 w-40 rounded" style={{ background: "var(--wsj-grey-light, #d5d0c4)" }} />
          </div>
        </div>

        {/* Stats bar skeleton */}
        <div className="grid grid-cols-4 md:grid-cols-8 gap-px my-4" style={{ background: "var(--wsj-grey, #c8c8c8)" }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="text-center py-2 px-1" style={{ background: "var(--wsj-white, #f5f0e8)" }}>
              <div className="h-2 w-8 rounded mx-auto mb-1" style={{ background: "var(--wsj-grey-light, #d5d0c4)" }} />
              <div className="h-4 w-12 rounded mx-auto" style={{ background: "var(--wsj-grey-light, #d5d0c4)" }} />
            </div>
          ))}
        </div>

        {/* Chart skeleton */}
        <div className="mt-4 mb-6">
          <div className="h-3 w-24 rounded mb-2" style={{ background: "var(--wsj-grey-light, #d5d0c4)" }} />
          <div className="h-[300px] rounded" style={{ background: "var(--wsj-grey-light, #d5d0c4)" }} />
        </div>

        {/* Two-column skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6 mt-2">
          <div className="space-y-4">
            <div className="h-3 w-28 rounded" style={{ background: "var(--wsj-grey-light, #d5d0c4)" }} />
            <div className="h-32 rounded" style={{ background: "var(--wsj-grey-light, #d5d0c4)" }} />
            <div className="h-3 w-36 rounded" style={{ background: "var(--wsj-grey-light, #d5d0c4)" }} />
            <div className="h-48 rounded" style={{ background: "var(--wsj-grey-light, #d5d0c4)" }} />
          </div>
          <div className="space-y-4">
            <div className="h-40 rounded" style={{ background: "var(--wsj-grey-light, #d5d0c4)", border: "1px solid var(--wsj-grey, #c8c8c8)" }} />
            <div className="h-52 rounded" style={{ background: "var(--wsj-grey-light, #d5d0c4)", border: "1px solid var(--wsj-grey, #c8c8c8)" }} />
            <div className="h-36 rounded" style={{ background: "var(--wsj-grey-light, #d5d0c4)", border: "1px solid var(--wsj-grey, #c8c8c8)" }} />
          </div>
        </div>
      </div>
    </div>
  );
}
