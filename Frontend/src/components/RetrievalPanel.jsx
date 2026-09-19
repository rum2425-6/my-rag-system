import { useEffect, useState } from "react";
import { Loader2, Search, Terminal } from "lucide-react";
import { cn, formatSimilarity, similarityPercent } from "../utils/helpers";

export default function RetrievalPanel({ onSearch, hasDocument }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (hasDocument) return;
    setQuery("");
    setResults(null);
    setError(null);
  }, [hasDocument]);

  const runSearch = async () => {
    const text = query.trim();
    if (!text || loading) return;
    setLoading(true);
    setError(null);
    const out = await onSearch(text, 5);
    if (out?.error) {
      setError(out.error);
      setResults(null);
    } else {
      setResults(out?.results ?? []);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-3">
      <p className="text-xs leading-relaxed text-slate-500">
        Inspect which chunks the retriever returns for a query, with similarity
        scores. Developer / debug feature.
      </p>

      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") runSearch();
          }}
          placeholder="Query the index…"
          disabled={!hasDocument}
          aria-label="Retrieval search query"
          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-400/40 focus:outline-none disabled:opacity-50"
        />
        <button
          type="button"
          onClick={runSearch}
          disabled={!hasDocument || !query.trim() || loading}
          aria-label="Search retrieval index"
          className={cn(
            "flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-slate-200 transition",
            hasDocument && query.trim() && !loading
              ? "hover:bg-white/10"
              : "cursor-not-allowed opacity-40"
          )}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 spin-slow" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </button>
      </div>

      {!hasDocument && (
        <p className="text-xs text-amber-300/80">
          Upload a document first to query the retriever.
        </p>
      )}

      {error && (
        <p className="rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs text-red-300">
          {error}
        </p>
      )}

      {results && results.length === 0 && (
        <p className="text-xs text-slate-500">No chunks retrieved for this query.</p>
      )}

      {results && results.length > 0 && (
        <div className="space-y-2">
          {results.map((source, i) => {
            const hasScore =
              typeof source?.score === "number" && !Number.isNaN(source.score);
            return (
              <div key={i} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-medium text-slate-300">
                    <Terminal className="h-3 w-3 text-indigo-300" />
                    {source.filename || `Chunk ${i + 1}`}
                  </span>
                  {hasScore && (
                    <span className="font-mono text-indigo-300">
                      {formatSimilarity(source.score)}
                    </span>
                  )}
                </div>
                {source.page != null && (
                  <p className="mt-1 text-[11px] text-slate-500">Page {source.page}</p>
                )}
                {hasScore && (
                  <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                      style={{ width: `${similarityPercent(source.score)}%` }}
                    />
                  </div>
                )}
                <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-slate-400">
                  {source.chunk}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
