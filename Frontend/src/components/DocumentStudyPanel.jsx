import { useMemo, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  CircleHelp,
  FileText,
  Loader2,
  MessageSquareText,
  Sparkles,
  XCircle,
} from "lucide-react";
import { cn } from "../utils/helpers";

const DIFFICULTY_OPTIONS = ["easy", "medium", "hard"];

function getDifficultyLabel(value) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : "Medium";
}

function SourceList({ sources, compact = false }) {
  if (!Array.isArray(sources) || !sources.length) return null;

  return (
    <div className="mt-3 space-y-1.5">
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        Sources
      </div>
      <div className="flex flex-wrap gap-2">
        {sources.map((source, index) => {
          const docName = source?.filename || "Document";
          const page = source?.page ? `p.${source.page}` : "page";
          const score = source?.score != null ? ` • ${Number(source.score).toFixed(2)}` : "";

          return (
            <span
              key={`${docName}-${source?.page ?? index}-${index}`}
              className={cn(
                "rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-300",
                compact && "px-1.5 py-0.5 text-[10px]"
              )}
            >
              {docName} {page}{score}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function StudySectionHeader({ icon: Icon, title, subtitle, action, children }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-indigo-400/20 bg-indigo-500/10 text-indigo-200">
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">{title}</h3>
            {subtitle && <p className="text-[11px] text-slate-400">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

export default function DocumentStudyPanel({
  documents,
  studyNotes,
  studyMcqs,
  studyExplanation,
  importantQuestions,
  studyLoading,
  studyError,
  onGenerateStudyNotes,
  onGenerateStudyMcqs,
  onExplainStudyTopic,
  onGenerateImportantQuestions,
  onAskQuestion,
}) {
  const [notesDifficulty, setNotesDifficulty] = useState("medium");
  const [mcqDifficulty, setMcqDifficulty] = useState("medium");
  const [topic, setTopic] = useState("");
  const [explainDifficulty, setExplainDifficulty] = useState("medium");
  const [importantDifficulty, setImportantDifficulty] = useState("hard");
  const [selectedMcqIndex, setSelectedMcqIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);

  const mcqs = Array.isArray(studyMcqs) ? studyMcqs : [];
  const activeMcq = mcqs[selectedMcqIndex] ?? null;

  const hasStudyData =
    Array.isArray(studyNotes) && studyNotes.length > 0
      ? true
      : mcqs.length > 0 || !!studyExplanation || importantQuestions.length > 0;

  const mcqOptions = activeMcq?.options ?? [];

  const mcqStatus = useMemo(() => {
    if (!activeMcq) return null;
    if (selectedOption == null) return null;
    const isCorrect = selectedOption === activeMcq.correct_answer;
    return {
      isCorrect,
      correctAnswer: activeMcq.correct_answer,
      explanation: activeMcq.explanation,
    };
  }, [activeMcq, selectedOption]);

  const handleMcqSelect = (value) => {
    if (!activeMcq || selectedOption != null) return;
    setSelectedOption(value);
  };

  const handleMoveToQuestion = (direction) => {
    if (!mcqs.length) return;
    const nextIndex = selectedMcqIndex + direction;
    if (nextIndex < 0) {
      setSelectedMcqIndex(mcqs.length - 1);
    } else if (nextIndex >= mcqs.length) {
      setSelectedMcqIndex(0);
    } else {
      setSelectedMcqIndex(nextIndex);
    }
    setSelectedOption(null);
  };

  const runExplain = () => {
    const trimmed = topic.trim();
    if (!trimmed) return;
    onExplainStudyTopic(trimmed, explainDifficulty);
  };

  return (
    <section className="shrink-0 border-b border-white/10 bg-[#17395f]/52 px-4 py-4 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-white">AI Study Mode</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Generate guided notes, practice questions, explanations, and key exam questions.
            </p>
          </div>
          {documents.length > 0 && (
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <FileText className="h-3.5 w-3.5 text-indigo-300" />
              {documents.length} {documents.length === 1 ? "document" : "documents"}
            </div>
          )}
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <StudySectionHeader
            icon={BookOpen}
            title="Study Notes"
            subtitle="Create grounded notes at the selected difficulty."
            action={
              <div className="flex items-center gap-2">
                <select
                  value={notesDifficulty}
                  onChange={(e) => setNotesDifficulty(e.target.value)}
                  className="rounded-lg border border-white/10 bg-slate-950/40 px-2 py-1.5 text-xs text-slate-200 outline-none"
                >
                  {DIFFICULTY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {getDifficultyLabel(option)}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => onGenerateStudyNotes(notesDifficulty)}
                  disabled={studyLoading.notes}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[11px] font-medium transition",
                    studyLoading.notes
                      ? "cursor-not-allowed border-white/10 bg-white/5 text-slate-500"
                      : "border-indigo-400/30 bg-indigo-500/10 text-indigo-200 hover:bg-indigo-500/20"
                  )}
                >
                  {studyLoading.notes ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  Generate Notes
                </button>
              </div>
            }
          >
            {studyError.notes && (
              <div className="mt-3 rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs text-red-300">
                {studyError.notes}
              </div>
            )}

            {studyLoading.notes && (
              <div className="mt-3 flex items-center gap-2 text-sm text-slate-300">
                <Loader2 className="h-4 w-4 animate-spin text-indigo-300" />
                Generating grounded notes...
              </div>
            )}

            {Array.isArray(studyNotes) && studyNotes.length > 0 && (
              <div className="mt-3 space-y-3">
                {studyNotes.map((section, index) => (
                  <div key={`${section.heading}-${index}`} className="rounded-xl border border-white/10 bg-slate-950/25 p-3">
                    <h4 className="text-sm font-semibold text-slate-100">{section.heading}</h4>
                    <div className="mt-2 space-y-2">
                      <div>
                        <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                          Key concepts
                        </div>
                        <ul className="space-y-1 text-sm text-slate-300">
                          {(section.key_concepts || []).map((item, itemIndex) => (
                            <li key={`${section.heading}-concept-${itemIndex}`} className="flex gap-2">
                              <span className="text-indigo-300">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                          Important points
                        </div>
                        <ul className="space-y-1 text-sm text-slate-300">
                          {(section.important_points || []).map((item, itemIndex) => (
                            <li key={`${section.heading}-point-${itemIndex}`} className="flex gap-2">
                              <span className="text-violet-300">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </StudySectionHeader>

          <StudySectionHeader
            icon={MessageSquareText}
            title="Practice MCQs"
            subtitle="Test your understanding with grounded multiple-choice questions."
            action={
              <div className="flex items-center gap-2">
                <select
                  value={mcqDifficulty}
                  onChange={(e) => setMcqDifficulty(e.target.value)}
                  className="rounded-lg border border-white/10 bg-slate-950/40 px-2 py-1.5 text-xs text-slate-200 outline-none"
                >
                  {DIFFICULTY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {getDifficultyLabel(option)}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => onGenerateStudyMcqs(5, mcqDifficulty)}
                  disabled={studyLoading.mcqs}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[11px] font-medium transition",
                    studyLoading.mcqs
                      ? "cursor-not-allowed border-white/10 bg-white/5 text-slate-500"
                      : "border-violet-400/30 bg-violet-500/10 text-violet-200 hover:bg-violet-500/20"
                  )}
                >
                  {studyLoading.mcqs ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  Generate MCQs
                </button>
              </div>
            }
          >
            {studyError.mcqs && (
              <div className="mt-3 rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs text-red-300">
                {studyError.mcqs}
              </div>
            )}

            {studyLoading.mcqs && (
              <div className="mt-3 flex items-center gap-2 text-sm text-slate-300">
                <Loader2 className="h-4 w-4 animate-spin text-violet-300" />
                Generating practice questions...
              </div>
            )}

            {mcqs.length > 0 && activeMcq && (
              <div className="mt-3 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Question {selectedMcqIndex + 1} / {mcqs.length}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleMoveToQuestion(-1)}
                      className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-300 hover:bg-white/10"
                    >
                      Prev
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveToQuestion(1)}
                      className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-300 hover:bg-white/10"
                    >
                      Next
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-slate-950/25 p-3">
                  <p className="text-sm leading-relaxed text-slate-200">{activeMcq.question}</p>
                  <div className="mt-3 space-y-2">
                    {mcqOptions.map((option) => {
                      const isSelected = selectedOption === option;
                      const isCorrect = option === activeMcq.correct_answer;
                      const reveal = selectedOption != null;

                      let optionClass = "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10";
                      if (reveal && isCorrect) optionClass = "border-emerald-400/40 bg-emerald-500/10 text-emerald-200";
                      if (reveal && isSelected && !isCorrect) optionClass = "border-red-400/40 bg-red-500/10 text-red-200";
                      if (reveal && !isCorrect && isSelected) optionClass = "border-red-400/40 bg-red-500/10 text-red-200";

                      return (
                        <button
                          key={`${activeMcq.question}-${option}`}
                          type="button"
                          disabled={selectedOption != null}
                          onClick={() => handleMcqSelect(option)}
                          className={cn(
                            "flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-100",
                            optionClass
                          )}
                        >
                          <span>{option}</span>
                          {reveal && isCorrect && <CheckCircle2 className="h-4 w-4 text-emerald-300" />}
                          {reveal && isSelected && !isCorrect && <XCircle className="h-4 w-4 text-red-300" />}
                        </button>
                      );
                    })}
                  </div>

                  {mcqStatus && (
                    <div className="mt-3 space-y-2 rounded-xl border border-white/10 bg-white/[0.02] p-3 text-sm">
                      <div className={mcqStatus.isCorrect ? "text-emerald-300" : "text-red-300"}>
                        {mcqStatus.isCorrect ? "Correct — well done." : `Incorrect — the correct answer is: ${mcqStatus.correctAnswer}`}
                      </div>
                      <div className="text-slate-300">
                        <span className="font-medium text-slate-200">Explanation:</span> {mcqStatus.explanation}
                      </div>
                    </div>
                  )}

                  {activeMcq.sources?.length > 0 && (
                    <SourceList sources={activeMcq.sources} compact />
                  )}
                </div>
              </div>
            )}
          </StudySectionHeader>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <StudySectionHeader
            icon={Sparkles}
            title="Explain a Topic"
            subtitle="Ask for a grounded explanation from the current document set."
            action={
              <div className="flex items-center gap-2">
                <select
                  value={explainDifficulty}
                  onChange={(e) => setExplainDifficulty(e.target.value)}
                  className="rounded-lg border border-white/10 bg-slate-950/40 px-2 py-1.5 text-xs text-slate-200 outline-none"
                >
                  {DIFFICULTY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {getDifficultyLabel(option)}
                    </option>
                  ))}
                </select>
              </div>
            }
          >
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Type a topic to explain"
                className="min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-400/50 focus:outline-none"
              />
              <button
                type="button"
                onClick={runExplain}
                disabled={studyLoading.explanation || !topic.trim()}
                className={cn(
                  "inline-flex items-center justify-center rounded-xl border px-3 py-2 text-xs font-medium transition",
                  studyLoading.explanation || !topic.trim()
                    ? "cursor-not-allowed border-white/10 bg-white/5 text-slate-500"
                    : "border-emerald-400/30 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20"
                )}
              >
                {studyLoading.explanation ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Explain"}
              </button>
            </div>

            {studyError.explanation && (
              <div className="mt-3 rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs text-red-300">
                {studyError.explanation}
              </div>
            )}

            {studyExplanation && (
              <div className="mt-3 space-y-3 rounded-xl border border-white/10 bg-slate-950/25 p-3">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Topic explanation
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-slate-200">
                    {studyExplanation.explanation}
                  </p>
                </div>

                {Array.isArray(studyExplanation.key_points) && studyExplanation.key_points.length > 0 && (
                  <div>
                    <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Key points
                    </div>
                    <ul className="space-y-1 text-sm text-slate-300">
                      {studyExplanation.key_points.map((point, index) => (
                        <li key={`${studyExplanation.topic}-point-${index}`} className="flex gap-2">
                          <span className="text-emerald-300">•</span>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <SourceList sources={studyExplanation.sources} />
              </div>
            )}
          </StudySectionHeader>

          <StudySectionHeader
            icon={CircleHelp}
            title="Important Questions"
            subtitle="Generate exam-oriented questions and answer focus prompts."
            action={
              <div className="flex items-center gap-2">
                <select
                  value={importantDifficulty}
                  onChange={(e) => setImportantDifficulty(e.target.value)}
                  className="rounded-lg border border-white/10 bg-slate-950/40 px-2 py-1.5 text-xs text-slate-200 outline-none"
                >
                  {DIFFICULTY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {getDifficultyLabel(option)}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => onGenerateImportantQuestions(5, importantDifficulty)}
                  disabled={studyLoading.important}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[11px] font-medium transition",
                    studyLoading.important
                      ? "cursor-not-allowed border-white/10 bg-white/5 text-slate-500"
                      : "border-cyan-400/30 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20"
                  )}
                >
                  {studyLoading.important ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  Generate Questions
                </button>
              </div>
            }
          >
            {studyError.important && (
              <div className="mt-3 rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs text-red-300">
                {studyError.important}
              </div>
            )}

            {studyLoading.important && (
              <div className="mt-3 flex items-center gap-2 text-sm text-slate-300">
                <Loader2 className="h-4 w-4 animate-spin text-cyan-300" />
                Generating important questions...
              </div>
            )}

            {importantQuestions.length > 0 && (
              <div className="mt-3 space-y-3">
                {importantQuestions.map((item, index) => (
                  <div key={`${item.question}-${index}`} className="rounded-xl border border-white/10 bg-slate-950/25 p-3">
                    <div className="text-sm font-medium text-slate-100">{item.question}</div>
                    <div className="mt-2 text-sm text-slate-300">
                      <span className="font-medium text-slate-200">Answer focus:</span> {item.answer_focus}
                    </div>
                    {Array.isArray(item.sources) && item.sources.length > 0 && (
                      <SourceList sources={item.sources} compact />
                    )}
                  </div>
                ))}
              </div>
            )}
          </StudySectionHeader>
        </div>

        {!documents.length && (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-6 text-center text-sm text-slate-400">
            Upload a document to unlock the AI Study Mode tools.
          </div>
        )}

        {documents.length > 0 && !hasStudyData && !studyLoading.notes && !studyLoading.mcqs && !studyLoading.explanation && !studyLoading.important && (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-6 text-center text-sm text-slate-400">
            Choose a study action to generate notes, questions, explanations, or exam prompts.
          </div>
        )}
      </div>
    </section>
  );
}
