import { useEffect, useRef } from "react";
import { Loader2, SendHorizonal } from "lucide-react";
import { cn } from "../utils/helpers";

export default function ChatInput({ value, onChange, onSend, loading }) {
  const textareaRef = useRef(null);

  // Auto-grow the textarea up to a max height.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [value]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!loading && value.trim()) onSend();
    }
  };

  const canSend = !loading && value.trim().length > 0;

  return (
    <div className="shrink-0 border-t border-white/10 bg-[#17395f]/78 px-4 py-3 backdrop-blur-xl sm:px-6">
      <div className="mx-auto flex max-w-3xl items-end gap-2">
        <div className="glass flex flex-1 items-end rounded-2xl px-3 py-2 transition focus-within:border-indigo-400/40">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="Ask something about your document…"
            aria-label="Ask a question about your document"
            className="max-h-[180px] w-full resize-none bg-transparent py-1.5 text-[15px] text-slate-100 placeholder:text-slate-500 focus:outline-none"
          />
        </div>

        <button
          type="button"
          onClick={() => {
            if (canSend) onSend();
          }}
          disabled={!canSend}
          aria-label="Send question"
          className={cn(
            "flex h-11 shrink-0 items-center gap-2 rounded-2xl px-4 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400",
            canSend
              ? "bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-900/30 hover:from-indigo-400 hover:to-violet-500"
              : "cursor-not-allowed bg-white/5 text-slate-500"
          )}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 spin-slow" />
              <span className="hidden sm:inline">Searching…</span>
            </>
          ) : (
            <>
              <SendHorizonal className="h-4 w-4" />
              <span className="hidden sm:inline">Send</span>
            </>
          )}
        </button>
      </div>

      <p className="mx-auto mt-2 max-w-3xl text-center text-[11px] text-slate-500">
        {loading
          ? "Searching document… generating answer…"
          : "Enter to send · Shift + Enter for a new line"}
      </p>
    </div>
  );
}
