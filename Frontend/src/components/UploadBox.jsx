import { useState } from "react";
import { UploadCloud, X } from "lucide-react";
import LoadingState from "./LoadingState";
import { cn } from "../utils/helpers";

export default function UploadBox({ onBrowse, onUpload, uploading, uploadProgress, error }) {
  const [dragging, setDragging] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (uploading) return;
    const files = Array.from(e.dataTransfer?.files || []);
    if (files.length) onUpload(files);
  };

  if (uploading) {
    const p = uploadProgress;
    const sending = p > 0 && p < 100;
    const analyzing = p >= 100;
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <LoadingState
          label={analyzing ? "Analyzing document…" : "Uploading document…"}
          sublabel={
            sending
              ? "Sending your PDF to the server"
              : analyzing
                ? "Processing & building the search index…"
                : "Preparing upload…"
          }
          progress={p}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload a PDF document"
        onClick={onBrowse}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onBrowse();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition",
          dragging
            ? "border-indigo-400/60 bg-indigo-500/10"
            : "border-white/15 bg-white/[0.02] hover:border-indigo-400/40 hover:bg-white/[0.04]"
        )}
      >
        <div
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-600/20 text-indigo-300 transition",
            dragging && "scale-105"
          )}
        >
          <UploadCloud className="h-7 w-7" />
        </div>
        <div>
          <p className="font-medium text-slate-100">Drop your PDFs here</p>
          <p className="mt-1 text-sm text-slate-400">
            or{" "}
            <span className="font-medium text-indigo-300 underline underline-offset-2">
              browse files
            </span>
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-slate-500">
          <span className="rounded-md border border-white/10 bg-white/5 px-2 py-1">PDF</span>
          <span className="rounded-md border border-white/10 bg-white/5 px-2 py-1">Max 200 MB</span>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2.5 text-sm text-red-300"
        >
          <X className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error.message}</span>
        </div>
      )}
    </div>
  );
}
