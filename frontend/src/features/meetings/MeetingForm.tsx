import React, { useState } from "react";
import { createMeeting } from "@/lib/api";
import { Meeting } from "@/types/meeting";
import { CheckCircle2, AlertCircle, Loader2, Send } from "lucide-react";

interface MeetingFormProps {
  onMeetingCreated: (meeting: Meeting) => void;
}

export function MeetingForm({ onMeetingCreated }: MeetingFormProps) {
  const [title, setTitle] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [attendeeCount, setAttendeeCount] = useState<number>(450);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      });

      onMeetingCreated(created);
      setSuccessMessage(
        `Засідання №${created.id} «${created.title}» успішно внесено до офіційного реєстру.`
      );

      // Reset form
      setTitle("");
      setStartsAt("");
      setEndsAt("");
      setAttendeeCount(450);
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.message.includes("401")) {
          setError("Потрібна авторизація (HTTP 401). Будь ласка, увійдіть через кнопку «Увійти» для створення засідань.");
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
          <label
            htmlFor="rada-title"
            className="block text-xs sm:text-sm font-bold text-neutral-800 dark:text-neutral-200 mb-1"
          >
            1. Назва засідання або порядок денний (title):
          </label>
          <input
            id="rada-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="наприклад: Пленарне засідання Верховної Ради України IX скликання"
            disabled={isSubmitting}
            required
            className="w-full text-xs sm:text-sm p-2.5 bg-white dark:bg-slate-900 border border-neutral-300 dark:border-neutral-600 rounded focus:border-[#184dbd] focus:outline-none font-sans"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="rada-starts-at"
              className="block text-xs sm:text-sm font-bold text-neutral-800 dark:text-neutral-200 mb-1"
            >
              2. Час відкриття засідання (starts_at):
            </label>
            <input
              id="rada-starts-at"
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              disabled={isSubmitting}
              required
              className="w-full text-xs sm:text-sm p-2.5 bg-white dark:bg-slate-900 border border-neutral-300 dark:border-neutral-600 rounded focus:border-[#184dbd] focus:outline-none font-sans"
            />
          </div>

          <div>
            <label
              htmlFor="rada-ends-at"
              className="block text-xs sm:text-sm font-bold text-neutral-800 dark:text-neutral-200 mb-1"
            >
              3. Час закриття засідання (ends_at):
            </label>
            <input
              id="rada-ends-at"
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
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
          <span className="block text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 italic">
            Конституційний склад Верховної Ради України становить 450 народних депутатів
            України.
          </span>
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
