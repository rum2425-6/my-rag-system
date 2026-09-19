from pathlib import Path
import json
import math
import os
import tempfile
import time
from typing import Literal
from uuid import uuid4

import faiss
import fitz
import numpy as np
from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from pydantic import BaseModel, Field
from rapidocr_onnxruntime import RapidOCR
from sentence_transformers import SentenceTransformer


app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
load_dotenv(Path(__file__).parent / ".env")
embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
faiss_index = None
indexed_chunks = []
active_documents = {}
ocr_engine = None

UPLOAD_DIR = Path(__file__).parent / "data" / "uploads"


def clear_current_session():
    global faiss_index

    upload_directory = UPLOAD_DIR.resolve()
    for document in active_documents.values():
        file_path = Path(document["stored_path"])
        try:
            if file_path.resolve().parent == upload_directory and file_path.exists():
                file_path.unlink()
        except OSError:
            pass

    active_documents.clear()
    indexed_chunks.clear()
    faiss_index = None


def extract_page_text(page):
    global ocr_engine

    text = page.get_text()
    if text.strip():
        return text

    if ocr_engine is None:
        ocr_engine = RapidOCR()

    pixmap = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
    image = np.frombuffer(pixmap.samples, dtype=np.uint8).reshape(
        pixmap.height, pixmap.width, pixmap.n
    )
    ocr_result, _ = ocr_engine(image)
    if not ocr_result:
        return ""

    return "\n".join(item[1] for item in ocr_result if len(item) > 1 and item[1].strip())


@app.get("/")
def home():
    return {
        "success": True,
        "message": "My RAG System is running"
    }


@app.get("/api/health")
def api_health():
    return {
        "success": True,
        "status": "ok",
        "message": "My RAG System is running",
    }


@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    global faiss_index

    filename = Path(file.filename or "").name

    if not filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    with tempfile.NamedTemporaryFile(
        mode="wb", suffix=".pdf", dir=UPLOAD_DIR, delete=False
    ) as uploaded_file:
        uploaded_file.write(await file.read())
        file_path = Path(uploaded_file.name)

    document_id = str(uuid4())

    with fitz.open(file_path) as pdf:
        page_count = len(pdf)
        page_texts = [extract_page_text(page) for page in pdf]

    extracted_text = "".join(page_texts)

    chunk_size = 500
    overlap = 50
    chunks = []
    for page_number, page_text in enumerate(page_texts, start=1):
        start = 0
        while start < len(page_text):
            end = min(start + chunk_size, len(page_text))
            chunks.append({
                "document_id": document_id,
                "filename": filename,
                "page": page_number,
                "text": page_text[start:end],
            })

            if end == len(page_text):
                break

            start = end - overlap

    document = {
        "document_id": document_id,
        "filename": filename,
        "stored_path": str(file_path),
        "pages": page_count,
        "text_length": len(extracted_text),
        "chunk_count": len(chunks),
    }
    active_documents[document_id] = document

    chunk_texts = [chunk["text"] for chunk in chunks]
    embeddings = embedding_model.encode(chunk_texts) if chunks else []
    embedding_dimension = len(embeddings[0]) if chunks else 0

    if chunks:
        embedding_matrix = np.asarray(embeddings, dtype="float32")
        faiss.normalize_L2(embedding_matrix)

        if faiss_index is None:
            faiss_index = faiss.IndexFlatIP(embedding_dimension)

        faiss_index.add(embedding_matrix)
        indexed_chunks.extend(chunks)

    return {
        "success": True,
        "filename": filename,
        "pages": page_count,
        "total_chunks": len(chunks),
        "chunks_preview": chunk_texts[:3],
        "embedding_dimension": embedding_dimension,
        "uploaded_document": {
            key: value for key, value in document.items() if key != "stored_path"
        },
        "total_documents": len(active_documents),
        "total_session_chunks": len(indexed_chunks),
    }


@app.post("/session/clear")
def clear_session():
    clear_current_session()
    return {
        "success": True,
        "message": "Temporary document session cleared",
    }


class SearchRequest(BaseModel):
    question: str = Field(min_length=1)
    k: int = Field(default=5, gt=0)


class AskRequest(BaseModel):
    question: str = Field(min_length=1)
    k: int = Field(default=3, gt=0)


class IntelligenceRequest(BaseModel):
    max_context_chars: int = Field(default=24000, gt=0, le=100000)


class SuggestedQuestionsRequest(BaseModel):
    count: int = Field(default=5, gt=0, le=10)
    max_context_chars: int = Field(default=16000, gt=0, le=100000)


class StudyNotesRequest(BaseModel):
    difficulty: Literal["easy", "medium", "hard"] = "medium"
    max_context_chars: int = Field(default=24000, gt=0, le=100000)


class StudyMcqsRequest(BaseModel):
    count: int = Field(default=5, ge=1, le=10)
    difficulty: Literal["easy", "medium", "hard"] = "medium"
    max_context_chars: int = Field(default=24000, gt=0, le=100000)


class StudyExplainRequest(BaseModel):
    topic: str = Field(min_length=1)
    difficulty: Literal["easy", "medium", "hard"] = "medium"
    k: int = Field(default=6, ge=1, le=10)
    max_context_chars: int = Field(default=12000, gt=0, le=100000)


class StudyImportantQuestionsRequest(BaseModel):
    count: int = Field(default=5, ge=1, le=10)
    difficulty: Literal["easy", "medium", "hard"] = "hard"
    max_context_chars: int = Field(default=24000, gt=0, le=100000)


def build_document_context(max_context_chars: int, include_document_id=False):
    if not active_documents or not indexed_chunks:
        raise HTTPException(status_code=400, detail="No document content is available")

    chunks_by_document = {document_id: [] for document_id in active_documents}
    for chunk in indexed_chunks:
        chunks_by_document.setdefault(chunk["document_id"], []).append(chunk)

    context_parts = []
    used_chars = 0
    active_document_ids = list(active_documents)
    document_index = 0
    chunk_indexes = {document_id: 0 for document_id in active_document_ids}

    while used_chars < max_context_chars:
        added_chunk = False
        for _ in range(len(active_document_ids)):
            if not active_document_ids:
                break

            document_id = active_document_ids[document_index % len(active_document_ids)]
            document_index += 1
            chunks = chunks_by_document.get(document_id, [])
            chunk_index = chunk_indexes[document_id]
            if chunk_index >= len(chunks):
                continue

            chunk = chunks[chunk_index]
            chunk_indexes[document_id] += 1
            remaining_chars = max_context_chars - used_chars
            document_label = f"Document: {chunk['filename']}\n"
            if include_document_id:
                document_label += f"Document ID: {chunk['document_id']}\n"
            prefix = (
                document_label
                + f"Page: {chunk['page']}\n"
                "Content:\n"
            )
            available_text_chars = remaining_chars - len(prefix)
            if available_text_chars <= 0:
                context = "\n\n".join(context_parts)
                if not context:
                    raise HTTPException(status_code=400, detail="Document context is empty")
                return context

            text = chunk["text"][:available_text_chars]
            context_parts.append(f"{prefix}{text}")
            used_chars += len(prefix) + len(text)
            added_chunk = True

            if len(text) < len(chunk["text"]):
                return "\n\n".join(context_parts)

        if not added_chunk:
            break

    context = "\n\n".join(context_parts)
    if not context:
        raise HTTPException(status_code=400, detail="Document context is empty")
    return context


def generate_gemini_text(prompt: str, error_label="generation"):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY is not configured")

    client = genai.Client(api_key=api_key)
    last_exception = None
    models = [
        "gemini-3.6-flash",
        "gemini-3-flash-preview",
        "gemini-3.1-flash-lite",
    ]
    for model_index, model in enumerate(models):
        try:
            response = client.models.generate_content(
                model=model,
                contents=prompt,
            )
            return response.text.strip() if response.text else ""
        except HTTPException:
            raise
        except Exception as exception:
            last_exception = exception
            error_text = str(exception).upper()
            is_transient = "503" in error_text or "UNAVAILABLE" in error_text or "429" in error_text
            if not is_transient or model_index == len(models) - 1:
                break
            time.sleep(1.5)

    error_message = str(last_exception).replace(api_key, "[REDACTED]")
    raise HTTPException(
        status_code=502,
        detail=f"Gemini {error_label} failed: {error_message}",
    )


def parse_gemini_json(text: str):
    if not text:
        raise HTTPException(status_code=502, detail="Gemini returned an empty response")

    cleaned_text = text.strip()
    if cleaned_text.startswith("```"):
        lines = cleaned_text.splitlines()
        if lines and lines[0].strip().startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        cleaned_text = "\n".join(lines).strip()

    try:
        return json.loads(cleaned_text)
    except json.JSONDecodeError as exception:
        raise HTTPException(
            status_code=502,
            detail=f"Gemini returned malformed JSON: {exception.msg}",
        )


def build_retrieved_context(results, max_context_chars):
    if not results:
        raise HTTPException(status_code=400, detail="No relevant document context was retrieved")

    context_parts = []
    used_chars = 0
    for result in results:
        prefix = (
            f"Document: {result['filename']}\n"
            f"Document ID: {result['document_id']}\n"
            f"Page: {result['page']}\n"
            f"Score: {result['score']}\n"
            "Content:\n"
        )
        remaining_chars = max_context_chars - used_chars
        available_text_chars = remaining_chars - len(prefix)
        if available_text_chars <= 0:
            break

        text = result["chunk"][:available_text_chars]
        context_parts.append(f"{prefix}{text}")
        used_chars += len(prefix) + len(text)
        if len(text) < len(result["chunk"]):
            break

    context = "\n\n".join(context_parts)
    if not context:
        raise HTTPException(status_code=400, detail="Retrieved document context is empty")
    return context


@app.post("/summarize")
def summarize(request: IntelligenceRequest):
    context = build_document_context(request.max_context_chars)
    prompt = f"""You are a document analysis assistant.
Use ONLY the supplied document context.
The context may come from multiple uploaded documents.
Do not use outside knowledge.
Do not invent or assume information.
If the supplied context is insufficient, say so.

Return ONLY valid JSON with this shape:
{{
  "summary": "combined grounded summary",
  "key_points": ["grounded point 1", "grounded point 2"]
}}

Document context:
{context}
"""
    response = parse_gemini_json(generate_gemini_text(prompt))
    summary = response.get("summary") if isinstance(response, dict) else None
    key_points = response.get("key_points") if isinstance(response, dict) else None
    if not isinstance(summary, str) or not isinstance(key_points, list):
        raise HTTPException(status_code=502, detail="Gemini returned an invalid summary")

    return {
        "success": True,
        "summary": summary,
        "key_points": [point for point in key_points if isinstance(point, str)],
        "documents": [
            {
                "document_id": document["document_id"],
                "filename": document["filename"],
                "pages": document["pages"],
            }
            for document in active_documents.values()
        ],
    }


@app.post("/suggested-questions")
def suggested_questions(request: SuggestedQuestionsRequest):
    context = build_document_context(request.max_context_chars)
    prompt = f"""You are a document analysis assistant.
Use ONLY the supplied document context.
The context may come from multiple uploaded documents.
Do not use outside knowledge.
Do not invent or assume information.
Every question must be answerable from the supplied context.

Return ONLY valid JSON with this shape:
{{"questions": ["question 1", "question 2"]}}
Return no more than {request.count} useful questions.

Document context:
{context}
"""
    response = parse_gemini_json(generate_gemini_text(prompt))
    questions = response.get("questions") if isinstance(response, dict) else None
    if not isinstance(questions, list):
        raise HTTPException(
            status_code=502,
            detail="Gemini returned an invalid suggested-questions response",
        )

    valid_questions = [question for question in questions if isinstance(question, str)]
    return {
        "success": True,
        "questions": valid_questions[:request.count],
    }


def validate_study_notes(response):
    notes = response.get("notes") if isinstance(response, dict) else None
    if not isinstance(notes, list):
        raise HTTPException(status_code=502, detail="Gemini returned invalid study notes")

    for note in notes:
        if not isinstance(note, dict):
            raise HTTPException(status_code=502, detail="Gemini returned invalid study notes")
        if not isinstance(note.get("heading"), str) or not note["heading"].strip():
            raise HTTPException(status_code=502, detail="Gemini returned invalid study notes")
        if not isinstance(note.get("key_concepts"), list):
            raise HTTPException(status_code=502, detail="Gemini returned invalid study notes")
        if not isinstance(note.get("important_points"), list):
            raise HTTPException(status_code=502, detail="Gemini returned invalid study notes")
        if not all(isinstance(item, str) for item in note["key_concepts"]):
            raise HTTPException(status_code=502, detail="Gemini returned invalid study notes")
        if not all(isinstance(item, str) for item in note["important_points"]):
            raise HTTPException(status_code=502, detail="Gemini returned invalid study notes")

    return notes


@app.post("/study/notes")
def study_notes(request: StudyNotesRequest):
    context = build_document_context(
        request.max_context_chars,
        include_document_id=True,
    )
    difficulty_guidance = {
        "easy": "Focus on definitions, direct recall, and simple explanations.",
        "medium": "Focus on understanding and basic application.",
        "hard": "Focus on comparison, synthesis, and multi-step reasoning.",
    }
    prompt = f"""You are an AI study assistant.

Use ONLY the supplied uploaded-document context.
Do not use outside knowledge.
Do not invent facts.
Every study note, concept, and important point must be supported by the supplied context.
If the context is insufficient, say so clearly.

Difficulty: {request.difficulty}
{difficulty_guidance[request.difficulty]}

Return ONLY valid JSON with this exact shape:
{{
  "notes": [
    {{
      "heading": "Core Concepts",
      "key_concepts": ["grounded concept"],
      "important_points": ["grounded important point"]
    }}
  ]
}}

Document context:
{context}
"""
    notes = validate_study_notes(
        parse_gemini_json(generate_gemini_text(prompt, error_label="study notes"))
    )

    return {
        "success": True,
        "difficulty": request.difficulty,
        "notes": notes,
        "documents": [
            {
                "document_id": document["document_id"],
                "filename": document["filename"],
                "pages": document["pages"],
            }
            for document in active_documents.values()
        ],
    }


def validate_study_mcqs(response, count):
    questions = response.get("questions") if isinstance(response, dict) else None
    if not isinstance(questions, list):
        raise HTTPException(status_code=502, detail="Gemini returned invalid MCQs")

    validated_questions = []
    for item in questions:
        if not isinstance(item, dict):
            continue

        question = item.get("question")
        options = item.get("options")
        correct_answer = item.get("correct_answer")
        explanation = item.get("explanation")
        sources = item.get("sources")

        if (
            not isinstance(question, str)
            or not question.strip()
            or not isinstance(options, list)
            or len(options) != 4
            or not all(isinstance(option, str) and option.strip() for option in options)
            or len(set(options)) != 4
            or not isinstance(correct_answer, str)
            or correct_answer not in options
            or not isinstance(explanation, str)
            or not explanation.strip()
            or not isinstance(sources, list)
            or not sources
        ):
            continue

        valid_sources = []
        for source in sources:
            if not isinstance(source, dict):
                continue
            document_id = source.get("document_id")
            document = active_documents.get(document_id)
            page = source.get("page")
            if (
                document is None
                or source.get("filename") != document["filename"]
                or not isinstance(page, int)
                or page < 1
                or page > document["pages"]
            ):
                continue
            valid_sources.append({
                "document_id": document_id,
                "filename": document["filename"],
                "page": page,
            })

        if not valid_sources:
            continue

        validated_questions.append({
            "question": question.strip(),
            "options": [option.strip() for option in options],
            "correct_answer": correct_answer.strip(),
            "explanation": explanation.strip(),
            "sources": valid_sources,
        })

        if len(validated_questions) == count:
            break

    return validated_questions


@app.post("/study/mcqs")
def study_mcqs(request: StudyMcqsRequest):
    context = build_document_context(
        request.max_context_chars,
        include_document_id=True,
    )
    difficulty_guidance = {
        "easy": "Focus on direct recall, definitions, and simple facts.",
        "medium": "Focus on understanding and basic application.",
        "hard": "Focus on comparison, synthesis, and multi-step reasoning.",
    }
    prompt = f"""You are an AI study assistant.

Generate multiple-choice questions using ONLY the supplied uploaded-document context.

Do not use outside knowledge.
Do not invent facts.
Every question, option, correct answer, and explanation must be supported by the supplied context.
Questions must test information actually present in the documents.
Incorrect options must not introduce unsupported factual claims.

Generate no more than {request.count} questions.
Difficulty: {request.difficulty}
{difficulty_guidance[request.difficulty]}

Return ONLY valid JSON with this exact shape:
{{
  "questions": [
    {{
      "question": "grounded question",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": "Option A",
      "explanation": "grounded explanation",
      "sources": [
        {{"document_id": "document id", "filename": "document filename", "page": 1}}
      ]
    }}
  ]
}}

Each question must have exactly four distinct non-empty options, and sources must identify the supporting uploaded document pages.

Document context:
{context}
"""
    questions = validate_study_mcqs(
        parse_gemini_json(generate_gemini_text(prompt, error_label="study MCQ generation")),
        request.count,
    )

    return {
        "success": True,
        "difficulty": request.difficulty,
        "questions": questions,
    }


def retrieve_chunks(question: str, k: int):
    if faiss_index is None or not indexed_chunks:
        raise HTTPException(status_code=404, detail="No PDF chunks have been indexed yet")

    question_embedding = embedding_model.encode([question])
    question_matrix = np.asarray(question_embedding, dtype="float32")
    faiss.normalize_L2(question_matrix)

    scores, indexes = faiss_index.search(question_matrix, min(k, len(indexed_chunks)))
    results = []
    seen_chunks = set()

    for score, index in zip(scores[0], indexes[0]):
        if index == -1:
            continue

        chunk = indexed_chunks[index]
        chunk_text = chunk["text"]
        if chunk_text in seen_chunks:
            continue

        seen_chunks.add(chunk_text)
        results.append({
            "chunk": chunk_text,
            "score": float(score),
            "document_id": chunk["document_id"],
            "filename": chunk["filename"],
            "page": chunk["page"],
        })

    return results


def validate_study_explanation(response, retrieved_results):
    if not isinstance(response, dict):
        raise HTTPException(status_code=502, detail="Gemini returned invalid topic explanation")

    explanation = response.get("explanation")
    key_points = response.get("key_points")
    sources = response.get("sources")
    if not isinstance(explanation, str) or not explanation.strip():
        raise HTTPException(status_code=502, detail="Gemini returned invalid topic explanation")
    if (
        not isinstance(key_points, list)
        or not key_points
        or not all(isinstance(point, str) and point.strip() for point in key_points)
    ):
        raise HTTPException(status_code=502, detail="Gemini returned invalid topic explanation")
    if not isinstance(sources, list) or not sources:
        raise HTTPException(status_code=502, detail="Gemini returned invalid explanation sources")

    retrieved_by_identity = {
        (result["document_id"], result["filename"], result["page"], result["chunk"]): result
        for result in retrieved_results
    }
    validated_sources = []
    for source in sources:
        if not isinstance(source, dict):
            continue
        document_id = source.get("document_id")
        filename = source.get("filename")
        page = source.get("page")
        chunk = source.get("chunk")
        score = source.get("score")
        if not isinstance(score, (int, float)) or isinstance(score, bool) or not math.isfinite(score):
            continue

        retrieved = retrieved_by_identity.get((document_id, filename, page, chunk))
        if retrieved is None:
            continue

        validated_sources.append({
            "document_id": retrieved["document_id"],
            "filename": retrieved["filename"],
            "page": retrieved["page"],
            "score": retrieved["score"],
            "chunk": retrieved["chunk"],
        })

    if not validated_sources:
        raise HTTPException(status_code=502, detail="Gemini returned invalid explanation sources")

    return explanation.strip(), [point.strip() for point in key_points], validated_sources


@app.post("/study/explain")
def study_explain(request: StudyExplainRequest):
    if not request.topic.strip():
        raise HTTPException(status_code=422, detail="Topic must not be empty")
    if not active_documents or not indexed_chunks:
        raise HTTPException(status_code=400, detail="No document content is available")

    retrieved_results = retrieve_chunks(request.topic, request.k)
    context = build_retrieved_context(retrieved_results, request.max_context_chars)
    difficulty_guidance = {
        "easy": "Use beginner-friendly language, definitions, and direct concepts.",
        "medium": "Give a detailed explanation of relationships between concepts and basic examples only when supported.",
        "hard": "Give a deeper explanation with comparison, synthesis, and multi-step reasoning only when supported.",
    }
    prompt = f"""You are an AI study assistant.

Explain the requested topic using ONLY the supplied retrieved document context.
Do not use outside knowledge.
Do not invent facts.
If the supplied context does not contain enough information, clearly say that the topic could not be sufficiently explained from the uploaded documents.
Do not introduce examples or facts that are not supported by the uploaded documents.

Topic: {request.topic}
Difficulty: {request.difficulty}
{difficulty_guidance[request.difficulty]}

Return ONLY valid JSON with this exact shape:
{{
  "explanation": "grounded explanation",
  "key_points": ["grounded key point"],
  "sources": [
    {{
      "document_id": "retrieved document id",
      "filename": "retrieved document filename",
      "page": 1,
      "score": 0.9,
      "chunk": "exact retrieved chunk text"
    }}
  ]
}}

Retrieved document context:
{context}
"""
    response = parse_gemini_json(
        generate_gemini_text(prompt, error_label="study explanation")
    )
    explanation, key_points, sources = validate_study_explanation(
        response,
        retrieved_results,
    )

    return {
        "success": True,
        "topic": request.topic,
        "difficulty": request.difficulty,
        "explanation": explanation,
        "key_points": key_points,
        "sources": sources,
    }


def validate_important_questions(response, count, context):
    questions = response.get("questions") if isinstance(response, dict) else None
    if not isinstance(questions, list):
        raise HTTPException(
            status_code=502,
            detail="Gemini returned invalid important questions",
        )

    validated_questions = []
    for item in questions:
        if not isinstance(item, dict):
            continue

        question = item.get("question")
        answer_focus = item.get("answer_focus")
        sources = item.get("sources")
        if (
            not isinstance(question, str)
            or not question.strip()
            or not isinstance(answer_focus, str)
            or not answer_focus.strip()
            or not isinstance(sources, list)
            or not sources
        ):
            continue

        valid_sources = []
        for source in sources:
            if not isinstance(source, dict):
                continue
            document_id = source.get("document_id")
            filename = source.get("filename")
            page = source.get("page")
            document = active_documents.get(document_id)
            context_marker = (
                f"Document: {filename}\n"
                f"Document ID: {document_id}\n"
                f"Page: {page}\n"
            )
            if (
                document is None
                or filename != document["filename"]
                or not isinstance(page, int)
                or isinstance(page, bool)
                or page < 1
                or page > document["pages"]
                or context_marker not in context
            ):
                continue
            valid_sources.append({
                "document_id": document_id,
                "filename": filename,
                "page": page,
            })

        if not valid_sources:
            continue

        validated_questions.append({
            "question": question.strip(),
            "answer_focus": answer_focus.strip(),
            "sources": valid_sources,
        })
        if len(validated_questions) == count:
            break

    return validated_questions


@app.post("/study/important-questions")
def study_important_questions(request: StudyImportantQuestionsRequest):
    context = build_document_context(
        request.max_context_chars,
        include_document_id=True,
    )
    difficulty_guidance = {
        "easy": "Focus on direct important questions, definitions, and basic recall.",
        "medium": "Focus on understanding, explanation, comparison, and application.",
        "hard": "Focus on deeper comparison, synthesis, and multi-step reasoning strictly based on the documents.",
    }
    prompt = f"""You are an AI study assistant.

Generate important exam-oriented questions using ONLY the supplied uploaded-document context.
Do not use outside knowledge.
Do not invent facts.
Every question must be answerable from the supplied uploaded documents.
Do not create questions whose answer is absent from the supplied context.
Keep the questions useful for exam preparation.

Generate no more than {request.count} questions.
Difficulty: {request.difficulty}
{difficulty_guidance[request.difficulty]}

Return ONLY valid JSON with this exact shape:
{{
  "questions": [
    {{
      "question": "grounded important question",
      "answer_focus": "grounded description of what an answer should cover",
      "sources": [
        {{"document_id": "document id", "filename": "document filename", "page": 1}}
      ]
    }}
  ]
}}

Each question must have at least one source whose document ID, filename, and page appear in the supplied context.

Document context:
{context}
"""
    questions = validate_important_questions(
        parse_gemini_json(
            generate_gemini_text(
                prompt,
                error_label="important question generation",
            )
        ),
        request.count,
        context,
    )

    return {
        "success": True,
        "difficulty": request.difficulty,
        "questions": questions,
    }


@app.post("/search")
def search(request: SearchRequest):
    results = retrieve_chunks(request.question, request.k)
    return {"results": results}


@app.post("/ask")
def ask(request: AskRequest):
    results = retrieve_chunks(request.question, request.k)

    context = "\n\n".join(result["chunk"] for result in results)
    prompt = f"""Answer ONLY using the provided context.
The context may come from multiple uploaded documents.
Do not use outside knowledge.
If the answer cannot be found in the context, respond exactly:
I could not find the answer in the uploaded documents.

Document context:
{context}

Question:
{request.question}
"""

    answer = generate_gemini_text(prompt, error_label="answer generation") or (
        "I could not find the answer in the uploaded documents."
    )

    return {
        "success": True,
        "question": request.question,
        "answer": answer,
        "sources": results,
    }
