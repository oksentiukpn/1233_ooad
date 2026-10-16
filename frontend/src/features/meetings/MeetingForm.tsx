import React, { useState, useRef } from "react";
import { createMeeting, parseAgendaText } from "@/lib/api";
import { Meeting } from "@/types/meeting";
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send,
  Sparkles,
  XCircle,
  Clock,
  ListTodo,
} from "lucide-react";

interface MeetingFormProps {
  onMeetingCreated: (meeting: Meeting) => void;
}

export function MeetingForm({ onMeetingCreated }: MeetingFormProps) {
  // Form fields
  const [title, setTitle] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [attendeeCount, setAttendeeCount] = useState<number>(450);
  const [agenda, setAgenda] = useState("");

  // AI Suggestion metadata and dirty tracking
  const [aiSuggestion, setAiSuggestion] = useState<Record<string, unknown> | null>(null);
  const [isSuggested, setIsSuggested] = useState<{
    title: boolean;
    startsAt: boolean;
    endsAt: boolean;
    agenda: boolean;
  }>({
    title: false,
    startsAt: false,
    endsAt: false,
    agenda: false,
  });

  // AI Paste box states
  const [pasteText, setPasteText] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Form states
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Parse pasted agenda with LLM via outside-VPC Lambda
  const handleParseAgenda = async () => {
    setParseError(null);
    if (!pasteText.trim()) {
      setParseError(
        "Будь ласка, вставте текст порядку денного для обробки штучним інтелектом."
      );
      return;
    }

    if (pasteText.length > 10000) {
      setParseError("Текст перевищує ліміт у 10,000 символів.");
      return;
    }

    setIsParsing(true);
    abortControllerRef.current = new AbortController();

    try {
      const resp = await parseAgendaText(
        pasteText.trim(),
        abortControllerRef.current.signal
      );
      const parsed = resp.agenda;

      setAiSuggestion({
        parsed_agenda: parsed,
        model: resp.model,
        prompt_version: resp.prompt_version,
        usage: resp.usage,
        latency_ms: resp.latency_ms,
        cost_usd: resp.cost_usd,
      });

      // Pre-fill form fields with suggestions and mark badges
      const newSuggested = { ...isSuggested };

      if (parsed.title) {
        setTitle(parsed.title);
        newSuggested.title = true;
      }

      if (parsed.starts_at) {
        // Format to YYYY-MM-DDTHH:mm for datetime-local input
        try {
          const d = new Date(parsed.starts_at);
          if (!isNaN(d.getTime())) {
            const pad = (n: number) => String(n).padStart(2, "0");
            const localIso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
              d.getDate()
            )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
            setStartsAt(localIso);
            newSuggested.startsAt = true;

            // If duration provided, calculate endsAt
            if (parsed.duration_minutes && parsed.duration_minutes > 0) {
              const endD = new Date(d.getTime() + parsed.duration_minutes * 60 * 1000);
              const localEndIso = `${endD.getFullYear()}-${pad(endD.getMonth() + 1)}-${pad(
                endD.getDate()
              )}T${pad(endD.getHours())}:${pad(endD.getMinutes())}`;
              setEndsAt(localEndIso);
              newSuggested.endsAt = true;
            }
          }
        } catch (e) {
          console.warn("Could not parse starts_at datetime", e);
        }
      }

      // Format agenda items into structured readable agenda text
      const lines: string[] = [];
      if (parsed.items && parsed.items.length > 0) {
        lines.push("ПОРЯДОК ДЕННИЙ:");
        parsed.items.forEach((it, idx) => {
          let line = `${idx + 1}. ${it.topic}`;
          if (it.owner) line += ` — ${it.owner}`;
          if (it.minutes) line += ` (${it.minutes} хв)`;
          lines.push(line);
        });
      }

      if (parsed.action_items && parsed.action_items.length > 0) {
        lines.push("\nЗАВДАННЯ ТА ДОРУЧЕННЯ:");
        parsed.action_items.forEach((act, idx) => {
          let line = `${idx + 1}) ${act.task}`;
          if (act.owner) line += ` (Виконавець: ${act.owner})`;
          if (act.due) line += ` [Термін: ${act.due}]`;
          lines.push(line);
        });
      }

      if (lines.length > 0) {
        setAgenda(lines.join("\n"));
        newSuggested.agenda = true;
      }

      setIsSuggested(newSuggested);
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.name === "AbortError") {
          setParseError("Обробку тексту скасовано користувачем.");
        } else if (err.message.includes("401")) {
          setParseError(
            "Потрібна авторизація (HTTP 401). Будь ласка, увійдіть у систему."
          );
        } else {
          setParseError(err.message);
        }
      } else {
        setParseError("Помилка при з'єднанні з сервісом штучного інтелекту.");
      }
    } finally {
      setIsParsing(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancelParse = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!title.trim()) {
      setError("Поле «Назва засідання» є обов'язковим для заповнення.");
      return;
    }

    if (!startsAt || !endsAt) {
      setError("Необхідно вказати точний час відкриття та закриття засідання.");
      return;
    }

    const startDate = new Date(startsAt);
    const endDate = new Date(endsAt);

    if (endDate <= startDate) {
      setError("Час закриття засідання повинен бути пізнішим за час його відкриття.");
      return;
    }

    if (attendeeCount < 0) {
      setError("Кількість учасників не може бути від'ємною.");
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await createMeeting({
        title: title.trim(),
        starts_at: startDate.toISOString(),
        ends_at: endDate.toISOString(),
        attendee_count: Number(attendeeCount),
        agenda: agenda.trim() || undefined,
        ai_suggestion: aiSuggestion || undefined,
      });

      onMeetingCreated(created);
      setSuccessMessage(
        `Засідання №${created.id} «${created.title}» успішно внесено до офіційного реєстру з порядком денним.`
      );

      // Reset form
      setTitle("");
      setStartsAt("");
      setEndsAt("");
      setAttendeeCount(450);
      setAgenda("");
      setPasteText("");
      setAiSuggestion(null);
      setIsSuggested({ title: false, startsAt: false, endsAt: false, agenda: false });
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.message.includes("401")) {
          setError(
            "Потрібна авторизація (HTTP 401). Будь ласка, увійдіть через кнопку «Увійти» для створення засідань."
          );
        } else {
          setError(err.message);
        }
      } else {
        setError("Помилка при реєстрації засідання у базі даних.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="border border-[#ced4da] dark:border-slate-700 bg-[#fdfdfd] dark:bg-slate-800/60 p-5 sm:p-6 rounded shadow-sm">
      <div className="border-b border-[#ced4da] dark:border-slate-700 pb-3 mb-4">
        <h2 className="font-rada-serif text-lg sm:text-xl font-bold uppercase tracking-wide text-black dark:text-white">
          РОЗДІЛ I. РЕЄСТРАЦІЙНА КАРТКА ЗАСІДАННЯ
        </h2>
        <p className="font-rada-serif text-xs italic text-neutral-600 dark:text-neutral-400 mt-0.5">
          Стаття 1. Порядок внесення нового пленарного засідання або наради до Єдиного
          державного реєстру
        </p>
      </div>

      {/* Lab 6: Paste an agenda box */}
      <div className="mb-6 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded p-4">
        <div className="flex items-center gap-2 mb-2 text-[#0e317e] dark:text-blue-300 font-bold text-xs sm:text-sm uppercase tracking-wide">
          <Sparkles className="h-4 w-4 text-[#184dbd] dark:text-blue-400" />
          <span>
            Швидке заповнення: Вставити порядок денний (Paste an agenda with AI)
          </span>
        </div>
        <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-3 font-rada-serif">
          Вставте довільний текст листа, повідомлення з чату або чорнових нотаток. Модель
          Mistral через Amazon Bedrock автоматично витягне тему, час, тривалість, пункти
          та доручення.
        </p>

        <textarea
          rows={3}
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
          disabled={isParsing || isSubmitting}
          placeholder="Наприклад: Пн 10:00, синк по прайсингу, 45 хв. 1) нові тарифи Pro — Олена, 15 хв 2) фідбек від клієнтів — Taras 3) що робимо з річною знижкою. Taras до п'ятниці збирає порівняння з конкурентами."
          className="w-full text-xs sm:text-sm p-2.5 bg-white dark:bg-slate-900 border border-neutral-300 dark:border-neutral-700 rounded focus:border-[#184dbd] focus:outline-none font-sans mb-2"
        />

        {parseError && (
          <div className="mb-2 p-2.5 text-xs bg-red-100 dark:bg-red-950/50 border border-red-300 dark:border-red-800 text-red-800 dark:text-red-200 rounded flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{parseError}</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          {!isParsing ? (
            <button
              type="button"
              onClick={handleParseAgenda}
              disabled={isSubmitting || !pasteText.trim()}
              className="px-4 py-2 bg-[#0e317e] hover:bg-[#184dbd] text-white text-xs font-bold uppercase tracking-wider rounded border border-[#09235c] shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Розпізнати штучним інтелектом (Parse with AI)</span>
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs text-[#0e317e] dark:text-blue-300 font-medium">
                <Loader2 className="h-4 w-4 animate-spin text-[#184dbd]" />
                <span>Аналізуємо текст через Amazon Bedrock (Ministral 3)...</span>
              </div>
              <button
                type="button"
                onClick={handleCancelParse}
                className="px-3 py-1 bg-neutral-200 hover:bg-neutral-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-neutral-800 dark:text-neutral-200 text-xs font-semibold rounded flex items-center gap-1 transition-colors"
              >
                <XCircle className="h-3.5 w-3.5" />
                <span>Скасувати</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 font-rada-serif">
        {error && (
          <div className="p-3 text-xs sm:text-sm bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-red-800 dark:text-red-200 rounded flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
            <div>
              <strong>Увага: </strong> {error}
            </div>
          </div>
        )}

        {successMessage && (
          <div className="p-3 text-xs sm:text-sm bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 rounded flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
            <div>
              <strong>Успішно: </strong> {successMessage}
            </div>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-1">
            <label
              htmlFor="rada-title"
              className="block text-xs sm:text-sm font-bold text-neutral-800 dark:text-neutral-200"
            >
              1. Назва засідання (title):
            </label>
            {isSuggested.title && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200 text-[10px] font-bold rounded-full uppercase tracking-wider">
                <Sparkles className="h-2.5 w-2.5" />
                AI Suggested
              </span>
            )}
          </div>
          <input
            id="rada-title"
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setIsSuggested({ ...isSuggested, title: false });
            }}
            placeholder="наприклад: Пленарне засідання Верховної Ради України IX скликання"
            disabled={isSubmitting}
            required
            className="w-full text-xs sm:text-sm p-2.5 bg-white dark:bg-slate-900 border border-neutral-300 dark:border-neutral-600 rounded focus:border-[#184dbd] focus:outline-none font-sans"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor="rada-starts-at"
                className="block text-xs sm:text-sm font-bold text-neutral-800 dark:text-neutral-200"
              >
                2. Час відкриття засідання (starts_at):
              </label>
              {isSuggested.startsAt && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200 text-[10px] font-bold rounded-full uppercase tracking-wider">
                  <Clock className="h-2.5 w-2.5" />
                  AI Suggested
                </span>
              )}
            </div>
            <input
              id="rada-starts-at"
              type="datetime-local"
              value={startsAt}
              onChange={(e) => {
                setStartsAt(e.target.value);
                setIsSuggested({ ...isSuggested, startsAt: false });
              }}
              disabled={isSubmitting}
              required
              className="w-full text-xs sm:text-sm p-2.5 bg-white dark:bg-slate-900 border border-neutral-300 dark:border-neutral-600 rounded focus:border-[#184dbd] focus:outline-none font-sans"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor="rada-ends-at"
                className="block text-xs sm:text-sm font-bold text-neutral-800 dark:text-neutral-200"
              >
                3. Час закриття засідання (ends_at):
              </label>
              {isSuggested.endsAt && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200 text-[10px] font-bold rounded-full uppercase tracking-wider">
                  <Clock className="h-2.5 w-2.5" />
                  AI Suggested
                </span>
              )}
            </div>
            <input
              id="rada-ends-at"
              type="datetime-local"
              value={endsAt}
              onChange={(e) => {
                setEndsAt(e.target.value);
                setIsSuggested({ ...isSuggested, endsAt: false });
              }}
              disabled={isSubmitting}
              required
              className="w-full text-xs sm:text-sm p-2.5 bg-white dark:bg-slate-900 border border-neutral-300 dark:border-neutral-600 rounded focus:border-[#184dbd] focus:outline-none font-sans"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="rada-attendee-count"
            className="block text-xs sm:text-sm font-bold text-neutral-800 dark:text-neutral-200 mb-1"
          >
            4. Кількість народних депутатів / учасників (attendee_count):
          </label>
          <input
            id="rada-attendee-count"
            type="number"
            min={0}
            value={attendeeCount}
            onChange={(e) => setAttendeeCount(parseInt(e.target.value, 10) || 0)}
            disabled={isSubmitting}
            required
            className="w-full sm:w-1/2 text-xs sm:text-sm p-2.5 bg-white dark:bg-slate-900 border border-neutral-300 dark:border-neutral-600 rounded focus:border-[#184dbd] focus:outline-none font-sans"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label
              htmlFor="rada-agenda"
              className="block text-xs sm:text-sm font-bold text-neutral-800 dark:text-neutral-200"
            >
              5. Порядок денний засідання (agenda):
            </label>
            {isSuggested.agenda && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200 text-[10px] font-bold rounded-full uppercase tracking-wider">
                <ListTodo className="h-2.5 w-2.5" />
                AI Suggested
              </span>
            )}
          </div>
          <textarea
            id="rada-agenda"
            rows={5}
            value={agenda}
            onChange={(e) => {
              setAgenda(e.target.value);
              setIsSuggested({ ...isSuggested, agenda: false });
            }}
            placeholder="Пункти порядку денного, доповідачі, регламент та проєкти рішень..."
            disabled={isSubmitting}
            className="w-full text-xs sm:text-sm p-2.5 bg-white dark:bg-slate-900 border border-neutral-300 dark:border-neutral-600 rounded focus:border-[#184dbd] focus:outline-none font-sans"
          />
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto px-6 py-2.5 bg-[#0e317e] hover:bg-[#184dbd] text-white text-xs sm:text-sm font-bold uppercase tracking-wider rounded border border-[#09235c] shadow-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-70 font-sans"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Триває реєстрація в системі...</span>
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                <span>Внести до офіційного реєстру засідань</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
