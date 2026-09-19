import { RefreshCw } from "lucide-react";
import { cn } from "../utils/helpers";

export default function BackendStatus({ status = "checking", onRetry }) {
  const isOnline = status === "online";
  const isOffline = status === "offline";

  return (
    <div className="flex items-center gap-2">
      <span
        title={
          isOnline
            ? "AI engine online"
            : isOffline
              ? "AI engine offline"
              : "Checking backend"
        }
        className={cn(
          "flex items-center gap-2 rounded-full border px-2.5 py-1.5 text-xs font-medium",
          isOnline && "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
          isOffline && "border-red-400/20 bg-red-400/10 text-red-300",
          status === "checking" &&
            "border-amber-400/20 bg-amber-400/10 text-amber-300"
        )}
      >
        <span className="relative flex h-2 w-2">
          <span
            className={cn(
              "absolute inline-flex h-full w-full rounded-full",
              isOnline && "bg-emerald-400 pulse-dot",
              isOffline && "bg-red-400 pulse-dot-red",
              status === "checking" && "bg-amber-400 pulse-dot-amber"
            )}
          />
        </span>
        <span className="hidden sm:inline">
          {isOnline && "Backend Online"}
          {isOffline && "Backend Offline"}
          {status === "checking" && "Checking…"}
        </span>
      </span>

      {isOffline && (
        <button
          type="button"
          onClick={onRetry}
          aria-label="Retry backend connection"
          className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-slate-300 transition hover:bg-white/10"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Retry</span>
        </button>
      )}
    </div>
  );
}
