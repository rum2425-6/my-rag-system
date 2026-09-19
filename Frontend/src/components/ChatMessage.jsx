import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AlertTriangle, BookOpen, Bot, ChevronDown } from "lucide-react";
import SourcePanel from "./SourcePanel";
import { cn } from "../utils/helpers";

function formatTime(ts) {
  try {
    return new Date(ts).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function ChatMessage({ message }) {
  const isUser = message.role === "user";
  const isError = Boolean(message.isError);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const hasSources = Array.isArray(message.sources) && message.sources.length > 0;

  if (isUser) {
    return (
      <div className="animate-fade-in-up flex justify-end">
        <div className="max-w-[85%] sm:max-w-[75%]">
          <div className="mb-1 flex items-center justify-end gap-2 text-xs text-slate-500">
            <span className="font-medium text-slate-400">You</span>
            <span>{formatTime(message.timestamp)}</span>
          </div>
          <div className="rounded-2xl rounded-br-md bg-gradient-to-br from-indigo-500 to-violet-600 px-4 py-3 text-[15px] leading-relaxed text-white shadow-lg shadow-indigo-900/20">
            {message.content}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up flex justify-start">
      <div className="flex w-full gap-3">
        <div
          className={cn(
            "mt-5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
            isError
              ? "bg-red-500/15 text-red-300"
              : "bg-gradient-to-br from-indigo-500/20 to-violet-600/20 text-indigo-300"
          )}
        >
          {isError ? <AlertTriangle className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2 text-xs text-slate-500">
            <span className="font-medium text-slate-300">RAG AI</span>
            <span>{formatTime(message.timestamp)}</span>
          </div>

          <div
            className={cn(
              "glass rounded-2xl rounded-tl-md px-4 py-3",
              isError && "border-red-400/20"
            )}
          >
            {isError ? (
              <p className="text-sm leading-relaxed text-red-200">{message.content}</p>
            ) : message.content && message.content.trim() ? (
              <div className="markdown">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {message.content}
                </ReactMarkdown>
              </div>
            ) : (
              <p className="text-sm text-slate-400">No answer was returned.</p>
            )}
          </div>

          {hasSources && (
            <div className="mt-2">
              <button
                type="button"
                onClick={() => setSourcesOpen((v) => !v)}
                aria-expanded={sourcesOpen}
                className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-white/10"
              >
                <BookOpen className="h-3.5 w-3.5" />
                Sources
                <span className="rounded-full bg-indigo-500/20 px-1.5 text-[10px] text-indigo-300">
                  {message.sources.length}
                </span>
                <ChevronDown
                  className={cn("h-3.5 w-3.5 transition-transform", sourcesOpen && "rotate-180")}
                />
              </button>
              {sourcesOpen && <SourcePanel sources={message.sources} />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
