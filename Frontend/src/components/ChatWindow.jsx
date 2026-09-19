import { useEffect, useRef } from "react";
import { Sparkles } from "lucide-react";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";
import EmptyState from "./EmptyState";

export default function ChatWindow({
  documents,
  messages,
  loading,
  question,
  onQuestionChange,
  onSend,
  onBrowse,
}) {
  const endRef = useRef(null);
  const hasDocuments = documents.length > 0;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  return (
    <section className="flex min-h-[520px] shrink-0 flex-col">
      {/* Header */}
      <div className="shrink-0 border-b border-white/10 px-4 py-4 sm:px-6">
        <h1 className="text-lg font-semibold text-white">Ask your document</h1>
        <p className="mt-0.5 text-sm text-slate-400">
          Ask questions and get answers grounded in your uploaded file.
        </p>
      </div>

      {!hasDocuments ? (
        <EmptyState onBrowse={onBrowse} />
      ) : (
        <>
          {/* Messages */}
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6">
            <div className="mx-auto flex max-w-3xl flex-col gap-5">
              {messages.length === 0 && !loading && (
                <div className="animate-fade-in-up flex justify-start">
                  <div className="flex w-full gap-3">
                    <div className="mt-5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-600/20 text-indigo-300">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-2 text-xs text-slate-500">
                        <span className="font-medium text-slate-300">RAG AI</span>
                      </div>
                      <div className="glass rounded-2xl rounded-tl-md px-4 py-3 text-sm leading-relaxed text-slate-300">
                        {documents.length} {documents.length === 1 ? "document" : "documents"} loaded. Ask me anything about their content.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}

              {loading && (
                <div className="animate-fade-in-up flex justify-start">
                  <div className="flex w-full gap-3">
                    <div className="mt-5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-600/20 text-indigo-300">
                      <span className="relative flex h-4 w-4">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-60" />
                        <span className="relative inline-flex h-4 w-4 rounded-full bg-indigo-400" />
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-2 text-xs text-slate-500">
                        <span className="font-medium text-slate-300">RAG AI</span>
                      </div>
                      <div className="glass rounded-2xl rounded-tl-md px-4 py-3">
                        <div className="space-y-2">
                          <div className="skeleton h-3 w-4/5" />
                          <div className="skeleton h-3 w-3/5" />
                          <div className="skeleton h-3 w-2/3" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={endRef} />
            </div>
          </div>

          <ChatInput
            value={question}
            onChange={onQuestionChange}
            onSend={onSend}
            loading={loading}
          />
        </>
      )}
    </section>
  );
}
