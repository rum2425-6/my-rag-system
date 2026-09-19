# 📚 My RAG System

A modern **Retrieval-Augmented Generation (RAG)** application that allows users to upload multiple PDF documents, ask questions about them, and receive answers grounded only in the uploaded documents.

The system also includes an **AI Study Mode** for generating study notes, MCQs, topic explanations, and important questions from uploaded documents.

---

## 🚀 Features

### 📄 Multi-PDF Upload
- Upload multiple PDF documents.
- Extract text from PDFs automatically.
- Process documents into smaller chunks.
- Maintain document metadata such as filename, pages, and chunks.

### 🔎 Semantic Search
- Convert document chunks into vector embeddings.
- Use **FAISS** for fast similarity search.
- Retrieve the most relevant sections for a user's query.

### 🤖 Document-Grounded Q&A
- Ask questions about uploaded PDFs.
- Gemini generates answers using retrieved document context.
- The system is designed to avoid unsupported answers.
- If the answer cannot be found in the uploaded documents, it returns:

> I could not find the answer in the uploaded document.

### 🧠 AI Study Mode

Generate study material directly from uploaded documents:

- 📝 Study Notes
- ❓ Multiple Choice Questions (MCQs)
- 💡 Topic Explanations
- ⭐ Important Questions
- 🎯 Difficulty levels: Easy, Medium, Hard
- 📚 Source references for generated content

### 📊 Document Intelligence

The system also supports:

- Document summaries
- Suggested questions
- Source-aware responses
- Multiple-document context

### 🗑️ Temporary Sessions

Users can clear their current session.

When a session is cleared:

- Uploaded PDFs are removed.
- Document chunks are removed.
- FAISS index data is cleared.
- Study data is reset.

---

# 🏗️ System Architecture

```text
                    ┌─────────────────────┐
                    │      React UI       │
                    │     Vite + CSS      │
                    └──────────┬──────────┘
                               │
                               │ HTTP API
                               ▼
                    ┌─────────────────────┐
                    │     FastAPI         │
                    │      Backend        │
                    └──────────┬──────────┘
                               │
                ┌──────────────┼──────────────┐
                │              │              │
                ▼              ▼              ▼
          ┌──────────┐   ┌───────────┐  ┌─────────────┐
          │ PyMuPDF  │   │ Sentence  │  │    FAISS    │
          │   PDF    │   │Transformers│ │Vector Search│
          │Extraction│   │ Embeddings │  │             │
          └──────────┘   └───────────┘  └─────────────┘
                                               │
                                               ▼
                                      ┌────────────────┐
                                      │ Retrieved Text │
                                      └───────┬────────┘
                                              │
                                              ▼
                                      ┌────────────────┐
                                      │ Google Gemini  │
                                      │  Generation    │
                                      └────────────────┘
