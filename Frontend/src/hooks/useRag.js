import { useCallback, useEffect, useState } from "react";
import api from "../services/api";
import {
  friendlyError,
  genId,
  normalizeSources,
  validatePdfFile,
} from "../utils/helpers";

// Central hook that owns all RAG assistant state and talks to the backend.
export function useRag() {
  const [documents, setDocuments] = useState([]);
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false); // waiting on /ask
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [backendStatus, setBackendStatus] = useState("checking"); // checking | online | offline
  const [error, setError] = useState(null); // { message, context }
  const [k, setK] = useState(3);
  const [summary, setSummary] = useState(null);
  const [keyPoints, setKeyPoints] = useState([]);
  const [suggestedQuestions, setSuggestedQuestions] = useState([]);
  const [intelligenceLoading, setIntelligenceLoading] = useState(false);
  const [intelligenceError, setIntelligenceError] = useState(null);

  const [studyNotes, setStudyNotes] = useState(null);
  const [studyMcqs, setStudyMcqs] = useState([]);
  const [studyExplanation, setStudyExplanation] = useState(null);
  const [importantQuestions, setImportantQuestions] = useState([]);
  const [studyLoading, setStudyLoading] = useState({
    notes: false,
    mcqs: false,
    explanation: false,
    important: false,
  });
  const [studyError, setStudyError] = useState({
    notes: null,
    mcqs: null,
    explanation: null,
    important: null,
  });

  const sessionActive = documents.length > 0;

  const reportError = useCallback((err, context, fallback) => {
    const message = friendlyError(err, fallback);
    setError({ message, context });
    return message;
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const clearIntelligenceState = useCallback(() => {
    setSummary(null);
    setKeyPoints([]);
    setSuggestedQuestions([]);
    setIntelligenceLoading(false);
    setIntelligenceError(null);
  }, []);

  const clearStudyState = useCallback(() => {
    setStudyNotes(null);
    setStudyMcqs([]);
    setStudyExplanation(null);
    setImportantQuestions([]);
    setStudyLoading({ notes: false, mcqs: false, explanation: false, important: false });
    setStudyError({ notes: null, mcqs: null, explanation: null, important: null });
  }, []);

  // ---------- Backend health ----------
  const checkBackend = useCallback(async () => {
    setBackendStatus("checking");
    try {
      await api.checkBackendHealth();
      setBackendStatus("online");
    } catch (err) {
      console.error("[useRag] backend health check failed", err);
      setBackendStatus("offline");
    }
  }, []);

  useEffect(() => {
    checkBackend();
  }, [checkBackend]);

  // ---------- Upload ----------
  const handleUpload = useCallback(
    async (file, { preserveError = false } = {}) => {
      const validationError = validatePdfFile(file);
      if (validationError) {
        setError({
          message: `${file?.name || "File"}: ${validationError}`,
          context: "upload",
        });
        return false;
      }

      if (!preserveError) setError(null);
      setUploading(true);
      setUploadProgress(0);

      try {
        const data = await api.uploadDocument(file, setUploadProgress);
        setDocuments((prev) => [
          ...prev,
          {
            ...(data.uploaded_document ?? {}),
            filename: data.filename ?? file.name,
            pages: data.pages,
            total_chunks: data.total_chunks,
            chunks_preview: data.chunks_preview ?? [],
          },
        ]);
        clearIntelligenceState();
        clearStudyState();
        setBackendStatus("online");
        return true;
      } catch (err) {
        console.error("[useRag] upload failed", err);
        reportError(
          err,
          "upload",
          `Upload failed for ${file.name}. Please try again.`
        );
        return false;
      } finally {
        setUploading(false);
        setUploadProgress(0);
      }
    },
    [clearIntelligenceState, clearStudyState, reportError]
  );

  // ---------- Document intelligence ----------
  const generateSummary = useCallback(async () => {
    if (!sessionActive || intelligenceLoading) return false;

    setIntelligenceLoading(true);
    setIntelligenceError(null);
    try {
      const data = await api.summarizeDocuments();
      setSummary(data.summary ?? "");
      setKeyPoints(Array.isArray(data.key_points) ? data.key_points : []);
      return true;
    } catch (err) {
      console.error("[useRag] summary generation failed", err);
      setIntelligenceError(
        friendlyError(err, "Could not generate a document summary. Please try again.")
      );
      return false;
    } finally {
      setIntelligenceLoading(false);
    }
  }, [intelligenceLoading, sessionActive]);

  const generateSuggestedQuestions = useCallback(async () => {
    if (!sessionActive || intelligenceLoading) return false;

    setIntelligenceLoading(true);
    setIntelligenceError(null);
    try {
      const data = await api.getSuggestedQuestions();
      setSuggestedQuestions(Array.isArray(data.questions) ? data.questions : []);
      return true;
    } catch (err) {
      console.error("[useRag] suggested questions failed", err);
      setIntelligenceError(
        friendlyError(err, "Could not generate suggested questions. Please try again.")
      );
      return false;
    } finally {
      setIntelligenceLoading(false);
    }
  }, [intelligenceLoading, sessionActive]);

  // ---------- AI study mode ----------
  const generateStudyNotes = useCallback(async (difficulty = "medium") => {
    if (!sessionActive || studyLoading.notes) return false;

    setStudyLoading((prev) => ({ ...prev, notes: true }));
    setStudyError((prev) => ({ ...prev, notes: null }));
    try {
      const data = await api.generateStudyNotes(difficulty);
      setStudyNotes(Array.isArray(data.notes) ? data.notes : []);
      return true;
    } catch (err) {
      console.error("[useRag] study notes failed", err);
      setStudyError((prev) => ({
        ...prev,
        notes: friendlyError(err, "Could not generate study notes. Please try again."),
      }));
      return false;
    } finally {
      setStudyLoading((prev) => ({ ...prev, notes: false }));
    }
  }, [sessionActive, studyLoading.notes]);

  const generateStudyMcqs = useCallback(async (count = 5, difficulty = "medium") => {
    if (!sessionActive || studyLoading.mcqs) return false;

    setStudyLoading((prev) => ({ ...prev, mcqs: true }));
    setStudyError((prev) => ({ ...prev, mcqs: null }));
    try {
      const data = await api.generateStudyMcqs(count, difficulty);
      setStudyMcqs(Array.isArray(data.questions) ? data.questions : []);
      return true;
    } catch (err) {
      console.error("[useRag] study MCQs failed", err);
      setStudyError((prev) => ({
        ...prev,
        mcqs: friendlyError(err, "Could not generate practice questions. Please try again."),
      }));
      return false;
    } finally {
      setStudyLoading((prev) => ({ ...prev, mcqs: false }));
    }
  }, [sessionActive, studyLoading.mcqs]);

  const explainStudyTopic = useCallback(async (topic, difficulty = "medium") => {
    const trimmedTopic = (topic ?? "").trim();
    if (!trimmedTopic) {
      setStudyError((prev) => ({ ...prev, explanation: "Enter a topic to explain." }));
      return false;
    }

    if (!sessionActive || studyLoading.explanation) return false;

    setStudyLoading((prev) => ({ ...prev, explanation: true }));
    setStudyError((prev) => ({ ...prev, explanation: null }));
    try {
      const data = await api.explainStudyTopic(trimmedTopic, difficulty);
      setStudyExplanation({
        topic: data.topic ?? trimmedTopic,
        difficulty: data.difficulty ?? difficulty,
        explanation: data.explanation ?? "",
        key_points: Array.isArray(data.key_points) ? data.key_points : [],
        sources: Array.isArray(data.sources) ? data.sources : [],
      });
      return true;
    } catch (err) {
      console.error("[useRag] explanation failed", err);
      setStudyError((prev) => ({
        ...prev,
        explanation: friendlyError(err, "Could not explain that topic. Please try again."),
      }));
      return false;
    } finally {
      setStudyLoading((prev) => ({ ...prev, explanation: false }));
    }
  }, [sessionActive, studyLoading.explanation]);

  const generateImportantQuestions = useCallback(async (count = 5, difficulty = "hard") => {
    if (!sessionActive || studyLoading.important) return false;

    setStudyLoading((prev) => ({ ...prev, important: true }));
    setStudyError((prev) => ({ ...prev, important: null }));
    try {
      const data = await api.generateImportantQuestions(count, difficulty);
      setImportantQuestions(Array.isArray(data.questions) ? data.questions : []);
      return true;
    } catch (err) {
      console.error("[useRag] important questions failed", err);
      setStudyError((prev) => ({
        ...prev,
        important: friendlyError(err, "Could not generate important questions. Please try again."),
      }));
      return false;
    } finally {
      setStudyLoading((prev) => ({ ...prev, important: false }));
    }
  }, [sessionActive, studyLoading.important]);

  // ---------- Ask ----------
  const handleAsk = useCallback(
    async (rawQuestion) => {
      const text = (rawQuestion ?? question).trim();
      if (!text) return;

      if (!sessionActive) {
        setError({
          message: "Upload a PDF document before asking a question.",
          context: "ask",
        });
        return;
      }

      setQuestion("");
      setError(null);

      setMessages((prev) => [
        ...prev,
        { id: genId(), role: "user", content: text, timestamp: Date.now() },
      ]);
      setLoading(true);

      try {
        const data = await api.askQuestion(text, k);
        const answer = data.answer ?? "";
        const sources = normalizeSources(data.sources);
        setMessages((prev) => [
          ...prev,
          {
            id: genId(),
            role: "assistant",
            content: answer,
            sources,
            timestamp: Date.now(),
          },
        ]);
      } catch (err) {
        console.error("[useRag] ask failed", err);
        const message = friendlyError(
          err,
          "The AI engine could not generate an answer. Please try again."
        );
        setMessages((prev) => [
          ...prev,
          {
            id: genId(),
            role: "assistant",
            content: message,
            isError: true,
            sources: [],
            timestamp: Date.now(),
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [question, k, sessionActive]
  );

  // ---------- Search (inspect retrieval / debug) ----------
  const handleSearch = useCallback(async (query, topK = 5) => {
    const text = (query ?? "").trim();
    if (!text) return { error: "Enter a query to inspect retrieval." };
    try {
      const data = await api.searchDocument(text, topK);
      return { results: normalizeSources(data) };
    } catch (err) {
      console.error("[useRag] search failed", err);
      const message = friendlyError(err, "Search failed. Please try again.");
      return { error: message };
    }
  }, []);

  // ---------- Clear / reset ----------
  const resetLocalState = useCallback(() => {
    setDocuments([]);
    setMessages([]);
    setQuestion("");
    setError(null);
    clearIntelligenceState();
    clearStudyState();
  }, [clearIntelligenceState, clearStudyState]);

  const handleClearSession = useCallback(async () => {
    setError(null);
    try {
      await api.clearSession();
      resetLocalState();
      return true;
    } catch (err) {
      console.error("[useRag] clear session failed", err);
      reportError(err, "clear", "Could not clear the session. Please try again.");
      return false;
    }
  }, [reportError, resetLocalState]);

  return {
    // state
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

    // setters
    setQuestion,
    setK,
    clearError,

    // actions
    checkBackend,
    handleUpload,
    handleAsk,
    handleSearch,
    generateSummary,
    generateSuggestedQuestions,
    generateStudyNotes,
    generateStudyMcqs,
    explainStudyTopic,
    generateImportantQuestions,
    handleClearSession,
    resetLocalState,
  };
}
