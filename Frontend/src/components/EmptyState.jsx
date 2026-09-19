import { Bot, UploadCloud } from "lucide-react";

export default function EmptyState({ onBrowse }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 py-16 text-center">
      <div className="relative">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-500/20 to-violet-600/20">
          <Bot className="h-10 w-10 text-indigo-300" />
        </div>
        <span className="absolute -right-1 -top-1 flex h-5 w-5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
          <span className="relative inline-flex h-5 w-5 rounded-full bg-emerald-400" />
        </span>
      </div>

      <div className="max-w-sm">
        <h2 className="text-xl font-semibold text-white">Upload a document to start</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          Your AI assistant will analyze your PDF and answer questions using its
          content.
        </p>
      </div>

      <button
        type="button"
        onClick={onBrowse}
        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-900/30 transition hover:from-indigo-400 hover:to-violet-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400"
      >
        <UploadCloud className="h-4 w-4" />
        Upload PDF
      </button>
    </div>
  );
}
