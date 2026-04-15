"use client";

import WSJLayout from "@/components/WSJLayout";
import { RED, TM, serif, sans } from "@/lib/wsj";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <WSJLayout>
      <div className="py-24 text-center">
        <h1
          className="text-[28px] font-bold mb-4"
          style={{ fontFamily: serif, color: RED }}
        >
          Something went wrong
        </h1>
        <p
          className="text-[13px] mb-6"
          style={{ fontFamily: sans, color: TM }}
        >
          {error.message || "An unexpected error occurred."}
        </p>
        <button
          onClick={reset}
          className="text-[11px] uppercase tracking-[0.15em] px-4 py-2 border cursor-pointer"
          style={{ fontFamily: sans, color: TM, borderColor: TM }}
        >
          Try Again
        </button>
      </div>
    </WSJLayout>
  );
}
