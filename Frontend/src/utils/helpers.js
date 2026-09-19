// Small shared utilities for the RAG assistant frontend.

export function genId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200 MB

// Client-side validation before hitting the backend.
export function validatePdfFile(file) {
  if (!file) return "No file was selected.";
  const isPdf =
    file.type === "application/pdf" || /\.pdf$/i.test(file.name || "");
  if (!isPdf) return "Invalid file type. Please upload a PDF document.";
  if (file.size === 0) return "The file appears to be empty.";
  if (file.size > MAX_FILE_SIZE) return "The file is too large (maximum 200 MB).";
  return null;
}

export function formatBytes(bytes) {
  if (!bytes || Number.isNaN(bytes)) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let value = bytes;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

export function formatSimilarity(score) {
  const value = Number(score);
  if (Number.isNaN(value)) return "—";
  return `${(value * 100).toFixed(1)}%`;
}

export function similarityPercent(score) {
  const value = Number(score);
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value * 100)));
}

// Normalize the various shapes a backend may return for retrieved chunks
// into a consistent array of { chunk, score } objects.
export function normalizeSources(data) {
  const list = Array.isArray(data)
    ? data
    : data?.results || data?.chunks || data?.sources || data?.matches || [];
  if (!Array.isArray(list)) return [];

  return list.map((item) => {
    if (typeof item === "string") return { chunk: item, score: null };
    return {
      chunk:
        item?.chunk ?? item?.content ?? item?.text ?? item?.document ?? "",
      score:
        item?.score ??
        item?.similarity ??
        item?.distance ??
        item?.relevance ??
        null,
      document_id: item?.document_id ?? item?.documentId ?? null,
      filename: item?.filename ?? item?.file_name ?? null,
      page: item?.page ?? item?.page_number ?? null,
    };
  });
}

// Convert backend/network errors into a user-friendly message. Technical
// details are logged to the console in the service layer for developers.
export function friendlyError(err, fallback = "Something went wrong. Please try again.") {
  if (!err) return fallback;

  const status = err?.status;
  const raw = err?.message || err?.detail || "";

  if (err?.name === "AbortError" || status === 408) {
    return "The request timed out. Please try again.";
  }
  if (status === 400) return raw || "The request was invalid. Please try again.";
  if (status === 404) return "The requested resource was not found.";
  if (status === 413) return "The file is too large to upload.";
  if (status === 422) return "The request could not be processed. Please check your input.";
  if (status === 502 || status === 504) {
    return "The AI engine is temporarily unavailable. Please try again in a moment.";
  }
  if (status === 500) return "The AI engine encountered a server error. Please try again.";
  if (status >= 500) return "The AI engine is having trouble. Please try again shortly.";
  if (status === 401 || status === 403) return "Access denied by the server.";

  if (/failed to fetch|networkerror|network error|load failed/i.test(raw)) {
    return "Backend is not reachable. Make sure the FastAPI server is running.";
  }

  // Keep readable messages but never leak stack traces to users.
  const looksLikeStack = /traceback|file "|\.py|:\d+:\d+|at .+\(/i.test(raw);
  if (raw && !looksLikeStack && raw.length < 300) return raw;

  return fallback;
}
