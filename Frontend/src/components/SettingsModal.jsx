import { useEffect } from "react";
import { Server, SlidersHorizontal, X } from "lucide-react";

export default function SettingsModal({ open, onClose, k, onKChange, baseUrl }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
    >
      <div className="absolute inset-0 bg-[#0f2744]/75 backdrop-blur-sm" onClick={onClose} />

      <div className="glass-strong animate-fade-in-up relative w-full max-w-md rounded-2xl p-5 glow">
        <div className="flex items-center justify-between">
          <h2 id="settings-title" className="text-base font-semibold text-white">
            Settings
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <Server className="h-3.5 w-3.5" />
              Backend
            </div>
            <div className="mt-2 break-all rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 font-mono text-xs text-slate-300">
              {baseUrl}
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
              Configured via <code className="text-slate-400">VITE_API_BASE_URL</code>.
              The Gemini API key lives only on the backend and is never exposed here.
            </p>
          </div>

          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Retrieval results (k)
            </div>
            <div className="mt-2 flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={10}
                step={1}
                value={k}
                onChange={(e) => onKChange(Number(e.target.value))}
                aria-label="Number of retrieval results"
                className="flex-1 accent-indigo-500"
              />
              <span className="w-8 text-center font-mono text-sm text-indigo-300">
                {k}
              </span>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
              How many relevant chunks to retrieve for each question.
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:from-indigo-400 hover:to-violet-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
