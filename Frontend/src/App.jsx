import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import ChatWindow from "./components/ChatWindow";
import ConfirmDialog from "./components/ConfirmDialog";
import DocumentIntelligencePanel from "./components/DocumentIntelligencePanel";
import DocumentStudyPanel from "./components/DocumentStudyPanel";
import SettingsModal from "./components/SettingsModal";
import { useRag } from "./hooks/useRag";
import api from "./services/api";
import { cn } from "./utils/helpers";

export default function App() {
  const {
    documents,
    messages,
    question,
    loading,
    uploading,
    uploadProgress,
    backendStatus,
    error,
    k,
    sessionActive,
    summary,
    keyPoints,
    suggestedQuestions,
    intelligenceLoading,
    intelligenceError,
    studyNotes,
    studyMcqs,
    studyExplanation,
    importantQuestions,
    studyLoading,
    studyError,
    setQuestion,
    setK,
    clearError,
    checkBackend,
    handleUpload,
    handleAsk,
    handleSearch,
    handleClearSession,
    generateSummary,
    generateSuggestedQuestions,
    generateStudyNotes,
    generateStudyMcqs,
    explainStudyTopic,
    generateImportantQuestions,
  } = useRag();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [clearing, setClearing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const fileInputRef = useRef(null);

  // Auto-dismiss the global error toast.
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(clearError, 7000);
    return () => clearTimeout(t);
  }, [error, clearError]);

  const openFilePicker = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  }, []);

  const handleFiles = useCallback(async (fileList) => {
    const files = Array.from(fileList || []).filter(Boolean);
    if (!files.length) return;

    clearError();
    for (const file of files) {
      await handleUpload(file, { preserveError: files.length > 1 });
    }
  }, [clearError, handleUpload]);

  const handleFileChange = (e) => {
    handleFiles(e.target.files);
    e.target.value = "";
  };

  const handleNewDocument = () => {
    openFilePicker();
  };

  const handleClearDocument = () => {
    if (sessionActive) setConfirm({ type: "clear" });
  };

  const confirmAction = async () => {
    if (!confirm || clearing) return;
    setClearing(true);
    const ok = await handleClearSession();
    setClearing(false);
    if (ok) {
      setConfirm(null);
    }
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden text-slate-200">
      {/* Hidden, programmatically-triggered file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        multiple
        className="sr-only"
        onChange={handleFileChange}
        aria-hidden="true"
        tabIndex={-1}
      />

      <Navbar
        backendStatus={backendStatus}
        onRetryBackend={checkBackend}
        onNewDocument={handleNewDocument}
        onClearDocument={handleClearDocument}
        onOpenSettings={() => setSettingsOpen(true)}
        hasDocument={sessionActive}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
      />

      <div className="relative flex min-h-0 flex-1">
        {/* Desktop sidebar */}
        <aside className="hidden w-[340px] shrink-0 border-r border-white/10 bg-[#10233f]/75 lg:block xl:w-[360px]">
          <Sidebar
            documents={documents}
            uploading={uploading}
            uploadProgress={uploadProgress}
            error={error}
            onBrowse={openFilePicker}
            onUpload={handleFiles}
            onClearDocument={handleClearDocument}
            onSearch={handleSearch}
          />
        </aside>

        {/* Mobile drawer */}
        <div
          inert={!sidebarOpen}
          aria-hidden={!sidebarOpen}
          className={cn(
            "fixed inset-y-0 left-0 z-40 w-[320px] max-w-[85vw] transform border-r border-white/10 bg-[#10233f] shadow-2xl transition-transform duration-300 lg:hidden",
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <Sidebar
            documents={documents}
            uploading={uploading}
            uploadProgress={uploadProgress}
            error={error}
            onBrowse={openFilePicker}
            onUpload={handleFiles}
            onClearDocument={() => {
              setSidebarOpen(false);
              handleClearDocument();
            }}
            onSearch={handleSearch}
          />
        </div>

        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-[#0f2744]/70 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main workspace */}
        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          {sessionActive && (
            <>
              <DocumentIntelligencePanel
                documents={documents}
                summary={summary}
                keyPoints={keyPoints}
                suggestedQuestions={suggestedQuestions}
                loading={intelligenceLoading}
                error={intelligenceError}
                onGenerateSummary={generateSummary}
                onGenerateQuestions={generateSuggestedQuestions}
                onAskQuestion={handleAsk}
              />
              <DocumentStudyPanel
                documents={documents}
                studyNotes={studyNotes}
                studyMcqs={studyMcqs}
                studyExplanation={studyExplanation}
                importantQuestions={importantQuestions}
                studyLoading={studyLoading}
                studyError={studyError}
                onGenerateStudyNotes={generateStudyNotes}
                onGenerateStudyMcqs={generateStudyMcqs}
                onExplainStudyTopic={explainStudyTopic}
                onGenerateImportantQuestions={generateImportantQuestions}
                onAskQuestion={handleAsk}
              />
            </>
          )}
          <ChatWindow
            documents={documents}
            messages={messages}
            loading={loading}
            question={question}
            onQuestionChange={setQuestion}
            onSend={() => handleAsk()}
            onBrowse={openFilePicker}
          />
        </main>
      </div>

      {/* Global error toast */}
      {error && (
        <div className="pointer-events-none fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 sm:left-auto sm:right-4 sm:translate-x-0">
          <div
            role="alert"
            className="glass-strong animate-fade-in-up pointer-events-auto flex items-start gap-3 rounded-2xl border border-red-400/20 p-3.5 glow"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
            <p className="flex-1 text-sm text-slate-200">{error.message}</p>
            <button
              type="button"
              onClick={clearError}
              aria-label="Dismiss"
              className="text-slate-500 transition hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirm)}
        title={
          confirm?.type === "new" ? "Replace current document?" : "Clear current document?"
        }
        message={
          confirm?.type === "new"
            ? "This will clear the current document and its RAG session before you select a new file."
            : "This will remove the current temporary document\nand its RAG session."
        }
        confirmLabel={confirm?.type === "new" ? "Continue" : "Clear Document"}
        loading={clearing}
        onConfirm={confirmAction}
        onCancel={() => {
          if (!clearing) setConfirm(null);
        }}
      />

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        k={k}
        onKChange={setK}
        baseUrl={api.baseUrl}
      />
    </div>
  );
}
