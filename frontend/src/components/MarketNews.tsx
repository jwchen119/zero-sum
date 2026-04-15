"use client";

import type { NewsArticle } from "@/lib/api";
import { INK, GRY, TM, display, serif, sans } from "@/lib/wsj";

interface Props {
  articles: NewsArticle[];
}

export default function MarketNews({ articles }: Props) {
  if (!articles?.length) return null;

  const [lead, ...rest] = articles;

  return (
    <div className="space-y-0">
      {/* Lead article — larger */}
      {lead && (
        <div className="pb-3 mb-3" style={{ borderBottom: `1px solid ${GRY}` }}>
          <a
            href={lead.link}
            target="_blank"
            rel="noopener noreferrer"
            className="block hover:opacity-80 transition-opacity"
          >
            <h3
              className="text-[16px] font-bold leading-snug mb-1"
              style={{ fontFamily: display, color: INK }}
            >
              {lead.title}
            </h3>
            <span
              className="text-[9px] font-extrabold uppercase tracking-[0.15em]"
              style={{ fontFamily: sans, color: TM }}
            >
              {lead.publisher}
            </span>
          </a>
        </div>
      )}

      {/* Remaining articles — compact list */}
      {rest.map((article, i) => (
        <div
          key={i}
          className="py-2"
          style={{ borderBottom: i < rest.length - 1 ? `1px solid ${GRY}44` : "none" }}
        >
          <a
            href={article.link}
            target="_blank"
            rel="noopener noreferrer"
            className="block hover:opacity-80 transition-opacity"
          >
            <p
              className="text-[13px] leading-snug mb-0.5"
              style={{ fontFamily: serif, color: INK }}
            >
              {article.title}
            </p>
            <span
              className="text-[8px] font-extrabold uppercase tracking-[0.15em]"
              style={{ fontFamily: sans, color: TM }}
            >
              {article.publisher}
            </span>
          </a>
        </div>
      ))}
    </div>
  );
}
