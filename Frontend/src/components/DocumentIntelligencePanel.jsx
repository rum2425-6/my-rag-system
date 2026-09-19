import {
  FileText,
  HelpCircle,
  KeyRound,
  Loader2,
  Sparkles,
} from "lucide-react";
import { cn } from "../utils/helpers";

export default function DocumentIntelligencePanel({
  documents,
  summary,
  keyPoints,
  suggestedQuestions,
  loading,
  error,
  onGenerateSummary,
  onGenerateQuestions,
  onAskQuestion,
}) {
  const hasSummary = Boolean(summary) || keyPoints.length > 0;
  const summaryDocuments = documents;

  return (
    <section className="shrink-0 border-b border-white/10 bg-[#17395f]/52 px-4 py-4 sm:px-6">
      <div className="mx-auto max-w-3xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-white">Document Intelligence</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Analyze the active document collection with grounded AI.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onGenerateSummary}
              disabled={loading}
              className={cn(
                "flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition",
                loading
                  ? "cursor-not-allowed border-white/10 bg-white/5 text-slate-500"
                  : "border-indigo-400/30 bg-indigo-500/10 text-indigo-200 hover:bg-indigo-500/20"
              )}
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 spin-slow" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              Generate Summary
            </button>
            <button
              type="button"
              onClick={onGenerateQuestions}
              disabled={loading}
              className={cn(
                "flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition",
                loading
                  ? "cursor-not-allowed border-white/10 bg-white/5 text-slate-500"
                  : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
              )}
            >
              <HelpCircle className="h-3.5 w-3.5" />
              Suggested Questions
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs text-red-300">
            {error}
          </div>
        )}

        {hasSummary && (
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(220px,0.65fr)]">
            {summary && (
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-300" />
                  Summary
                </div>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">{summary}</p>
              </div>
            )}

            {keyPoints.length > 0 && (
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  <KeyRound className="h-3.5 w-3.5 text-indigo-300" />
                  Key Points
                </div>
                <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-slate-300">
                  {keyPoints.map((point, index) => (
                    <li key={`${point}-${index}`} className="flex gap-2">
                      <span className="text-indigo-300">•</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {hasSummary && summaryDocuments.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              Documents used:
            </span>
            {summaryDocuments.map((document) => (
              <span
                key={document.document_id || document.filename}
                className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-slate-300"
              >
                {document.filename}
              </span>
            ))}
          </div>
        )}

        {suggestedQuestions.length > 0 && (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <HelpCircle className="h-3.5 w-3.5 text-indigo-300" />
              Suggested Questions
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {suggestedQuestions.map((question, index) => (
                <button
                  key={`${question}-${index}`}
                  type="button"
                  onClick={() => onAskQuestion(question)}
                  disabled={loading}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-left text-xs text-slate-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
