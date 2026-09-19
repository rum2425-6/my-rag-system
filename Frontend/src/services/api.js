// Central API service for the RAG backend.
// Every request goes through the FastAPI server — the frontend never talks
// to Gemini directly, and the Gemini API key is never present here.

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"
).replace(/\/+$/, "");

const DEFAULT_TIMEOUT = 45000; // generous window for retrieval + generation

function parseBody(text) {
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

function buildHttpError(data, status) {
  const message =
    data?.detail || data?.error || data?.message || `Request failed (${status})`;
  const err = new Error(message);
  err.status = status;
  err.data = data;
  err.detail = data?.detail || data?.error || data?.message;
  return err;
}

async function request(path, options = {}) {
  const { timeout = DEFAULT_TIMEOUT, ...init } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
    });

    const text = await response.text();
    const data = parseBody(text);

    if (!response.ok || data?.success === false) {
      console.error(
        `[api] ${init.method || "GET"} ${path} failed (${response.status})`,
        data
      );
      throw buildHttpError(data, response.status);
    }

    return data;
  } catch (err) {
    if (err?.status) throw err; // already a structured HTTP error

    if (err?.name === "AbortError") {
      const timeoutErr = new Error("The request timed out.");
      timeoutErr.status = 408;
      throw timeoutErr;
    }

    console.error(`[api] network error on ${path}`, err);
    const networkErr = new Error(
      "Backend is not reachable. Make sure the FastAPI server is running."
    );
    networkErr.status = 0;
    networkErr.cause = err;
    throw networkErr;
  } finally {
    clearTimeout(timer);
  }
}

// GET / — basic health check used for the status indicator.
export function checkBackendHealth() {
  return request("/", { method: "GET", timeout: 8000 });
}

// POST /upload — multipart/form-data with real progress via XHR.
export function uploadDocument(file, onProgress) {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE_URL}/upload`);
    xhr.timeout = 180000; // uploads + indexing can take a while

    if (typeof onProgress === "function") {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      };
    }

    xhr.onload = () => {
      const data = parseBody(xhr.responseText);
      if (xhr.status >= 200 && xhr.status < 300 && data?.success !== false) {
        resolve(data);
      } else {
        console.error(`[api] POST /upload failed (${xhr.status})`, data);
        reject(buildHttpError(data, xhr.status));
      }
    };
    xhr.onerror = () => {
      console.error("[api] network error on /upload");
      const err = new Error(
        "Backend is not reachable. Make sure the FastAPI server is running."
      );
      err.status = 0;
      reject(err);
    };
    xhr.ontimeout = () => {
      const err = new Error("The upload timed out.");
      err.status = 408;
      reject(err);
    };
    xhr.onabort = () => {
      const err = new Error("The upload was cancelled.");
      err.status = 0;
      reject(err);
    };

    xhr.send(formData);
  });
}

// POST /ask
export function askQuestion(question, k = 3) {
  return request("/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, k }),
  });
}

// POST /search
export function searchDocument(question, k = 5) {
  return request("/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, k }),
  });
}

// POST /summarize
export function summarizeDocuments(options = {}) {
  return request("/summarize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(options),
    timeout: 120000,
  });
}

// POST /suggested-questions
export function getSuggestedQuestions(options = {}) {
  return request("/suggested-questions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(options),
    timeout: 120000,
  });
}

// POST /study/notes
export function generateStudyNotes(difficulty = "medium", maxContextChars = 24000) {
  return request("/study/notes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ difficulty, max_context_chars: maxContextChars }),
    timeout: 120000,
  });
}

// POST /study/mcqs
export function generateStudyMcqs(count = 5, difficulty = "medium", maxContextChars = 24000) {
  return request("/study/mcqs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ count, difficulty, max_context_chars: maxContextChars }),
    timeout: 120000,
  });
}

// POST /study/explain
export function explainStudyTopic(topic, difficulty = "medium", k = 6, maxContextChars = 12000) {
  return request("/study/explain", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic, difficulty, k, max_context_chars: maxContextChars }),
    timeout: 120000,
  });
}

// POST /study/important-questions
export function generateImportantQuestions(count = 5, difficulty = "hard", maxContextChars = 24000) {
  return request("/study/important-questions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ count, difficulty, max_context_chars: maxContextChars }),
    timeout: 120000,
  });
}

// POST /session/clear
export function clearSession() {
  return request("/session/clear", { method: "POST", timeout: 20000 });
}

const api = {
  baseUrl: API_BASE_URL,
  checkBackendHealth,
  uploadDocument,
  askQuestion,
  searchDocument,
  summarizeDocuments,
  getSuggestedQuestions,
  generateStudyNotes,
  generateStudyMcqs,
  explainStudyTopic,
  generateImportantQuestions,
  clearSession,
};

export default api;
