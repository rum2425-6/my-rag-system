import { useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  FileText,
  Trash2,
  Wrench,
} from "lucide-react";
import UploadBox from "./UploadBox";
import RetrievalPanel from "./RetrievalPanel";
import { cn } from "../utils/helpers";

export default function Sidebar({
  documents,
  uploading,
  uploadProgress,
  error,
  onBrowse,
  onUpload,
  onClearDocument,
  onSearch,
}) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const hasDocuments = documents.length > 0;

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-4">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-indigo-300" />
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Documents
          </h2>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {uploading ? (
          <UploadBox
            onBrowse={onBrowse}
            onUpload={onUpload}
            uploading={uploading}
            uploadProgress={uploadProgress}
            error={error?.context === "upload" ? error : null}
          />
        ) : hasDocuments ? (
          <div className="space-y-3">
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.06] p-4">
              <div className="flex items-center gap-2 text-emerald-300">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-widest">
                  {documents.length} {documents.length === 1 ? "Document" : "Documents"} Loaded
                </span>
              </div>

              <div className="mt-3 space-y-2">
                {documents.map((document) => (
                  <div
                    key={document.document_id || `${document.filename}-${document.pages}`}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-2.5"
                  >
                    <p className="truncate text-sm font-medium text-slate-100" title={document.filename}>
                      {document.filename}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {document.pages ?? "—"} pages · {document.total_chunks ?? document.chunk_count ?? "—"} chunks
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300">
                Status:{" "}
                <span className="font-medium text-emerald-300">Ready for questions</span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClearDocument}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-red-400/30 hover:bg-red-400/10 hover:text-red-300"
            >
              <Trash2 className="h-4 w-4" />
              Clear Document
            </button>
          </div>
        ) : (
          <UploadBox
            onBrowse={onBrowse}
            onUpload={onUpload}
            uploading={uploading}
            uploadProgress={uploadProgress}
            error={error?.context === "upload" ? error : null}
          />
        )}

        {/* Advanced retrieval */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02]">
          <button
            type="button"
            onClick={() => setAdvancedOpen((v) => !v)}
            aria-expanded={advancedOpen}
            className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
          >
            <span className="flex items-center gap-2 text-sm font-medium text-slate-200">
              <Wrench className="h-4 w-4 text-slate-400" />
              Advanced Retrieval
            </span>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-slate-400 transition-transform",
                advancedOpen && "rotate-180"
              )}
            />
          </button>
          {advancedOpen && (
            <div className="border-t border-white/10 p-4">
              <RetrievalPanel onSearch={onSearch} hasDocument={hasDocuments} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
