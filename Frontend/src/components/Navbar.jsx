import { FilePlus2, Menu, Settings2, Trash2 } from "lucide-react";
import BackendStatus from "./BackendStatus";
import { cn } from "../utils/helpers";

export default function Navbar({
  backendStatus,
  onRetryBackend,
  onNewDocument,
  onClearDocument,
  onOpenSettings,
  hasDocument,
  onToggleSidebar,
}) {
  return (
    <header className="relative z-30 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-[#17395f]/82 px-4 backdrop-blur-xl sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label="Toggle document panel"
          className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:bg-white/10 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-900/40">
            <span className="text-sm font-bold text-white">R</span>
          </div>
          <div className="min-w-0 leading-tight">
            <div className="truncate text-[15px] font-semibold tracking-tight text-white">
              RAG AI
            </div>
            <div className="hidden truncate text-xs text-slate-400 sm:block">
              Document Intelligence
            </div>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <BackendStatus status={backendStatus} onRetry={onRetryBackend} />

        <button
          type="button"
          onClick={onNewDocument}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-3 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-900/30 transition hover:from-indigo-400 hover:to-violet-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400"
        >
          <FilePlus2 className="h-4 w-4" />
          <span className="hidden md:inline">New Document</span>
        </button>

        <button
          type="button"
          onClick={onClearDocument}
          disabled={!hasDocument}
          aria-label="Clear document"
          title={hasDocument ? "Clear current document" : "No document loaded"}
          className={cn(
            "flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-slate-200 transition",
            hasDocument
              ? "hover:bg-white/10 hover:text-white"
              : "cursor-not-allowed opacity-40"
          )}
        >
          <Trash2 className="h-4 w-4" />
          <span className="hidden md:inline">Clear Session</span>
        </button>

        <button
          type="button"
          onClick={onOpenSettings}
          aria-label="Open settings"
          className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
        >
          <Settings2 className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
