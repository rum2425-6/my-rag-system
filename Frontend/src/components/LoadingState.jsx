import { Loader2 } from "lucide-react";
import { cn } from "../utils/helpers";

export default function LoadingState({
  label = "Loading…",
  sublabel,
  progress,
  size = "md",
}) {
  // Show a determinate bar only while bytes are actively being sent (1–99%).
  // At 0% (not yet started) or 100% (server processing) we show a spinner.
  const isDeterminate =
    typeof progress === "number" && progress > 0 && progress < 100;

  if (isDeterminate) {
    return (
      <div className="w-full py-1">
        <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
          <span>{label}</span>
          <span className="font-mono text-indigo-300">{Math.min(100, progress)}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-300"
            style={{ width: `${Math.min(100, progress)}%` }}
          />
        </div>
        {sublabel && <p className="mt-2 text-xs text-slate-500">{sublabel}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-2 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5">
        <Loader2
          className={cn("spin-slow text-indigo-300", size === "sm" ? "h-4 w-4" : "h-5 w-5")}
        />
      </div>
      <div>
        <p className="text-sm font-medium text-slate-200">{label}</p>
        {sublabel && <p className="mt-1 text-xs text-slate-500">{sublabel}</p>}
      </div>
    </div>
  );
}
