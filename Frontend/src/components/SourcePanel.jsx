import { FileSearch } from "lucide-react";
import { formatSimilarity, similarityPercent } from "../utils/helpers";

export default function SourcePanel({ sources = [] }) {
  if (!sources.length) {
    return (
      <div className="mt-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-400">
        No sources were returned for this answer.
      </div>
    );
  }

  return (
    <div className="mt-2 space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        <FileSearch className="h-3.5 w-3.5" />
        Retrieved context
      </div>

      {sources.map((source, index) => {
        const hasScore = typeof source?.score === "number" && !Number.isNaN(source.score);
        const percent = similarityPercent(source?.score);

        return (
          <div key={index} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-slate-200" title={source.filename || undefined}>
                  {source.filename || `Source ${index + 1}`}
                </p>
                {source.page != null && (
                  <p className="mt-0.5 text-[11px] text-slate-500">Page {source.page}</p>
                )}
              </div>
              {hasScore && (
                <span className="font-mono text-xs text-indigo-300">
                  {formatSimilarity(source.score)}
                </span>
              )}
            </div>

            {hasScore && (
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                  style={{ width: `${percent}%` }}
                />
              </div>
            )}

            <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Relevant content
            </p>
            <p className="mt-1 text-sm leading-relaxed text-slate-300">
              {source.chunk || "—"}
            </p>
          </div>
        );
      })}
    </div>
  );
}
