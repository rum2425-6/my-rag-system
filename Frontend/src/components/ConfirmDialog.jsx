import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "../utils/helpers";

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = true,
  loading = false,
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape" && !loading) onCancel?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, loading, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
    >
      <div
        className="absolute inset-0 bg-[#0f2744]/75 backdrop-blur-sm"
        onClick={loading ? undefined : onCancel}
      />

      <div className="glass-strong animate-fade-in-up relative w-full max-w-sm rounded-2xl p-5 glow">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
              danger ? "bg-red-500/15 text-red-300" : "bg-indigo-500/15 text-indigo-300"
            )}
          >
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 id="confirm-title" className="text-base font-semibold text-white">
              {title}
            </h2>
            <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-slate-400">
              {message}
            </p>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            autoFocus
            className={cn(
              "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
              danger
                ? "bg-red-500 hover:bg-red-400 focus-visible:outline-red-400"
                : "bg-indigo-500 hover:bg-indigo-400 focus-visible:outline-indigo-400",
              loading && "cursor-wait opacity-70"
            )}
          >
            {loading ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
