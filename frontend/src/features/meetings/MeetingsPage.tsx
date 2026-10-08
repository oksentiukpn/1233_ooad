import { useEffect, useState } from "react";
import { useAuth } from "react-oidc-context";
import { Meeting } from "@/types/meeting";
import { fetchMeetings } from "@/lib/api";
import { MeetingForm } from "./MeetingForm";
import { MeetingList } from "./MeetingList";
import { AlertTriangle, RefreshCw, FileText, CalendarDays } from "lucide-react";

interface MeetingsPageProps {
  searchQuery?: string;
  activeTab: "registry" | "create" | "card" | "history";
  setActiveTab: (tab: "registry" | "create" | "card" | "history") => void;
}

export function MeetingsPage({
  searchQuery = "",
  activeTab,
  setActiveTab,
}: MeetingsPageProps) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMeetings = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchMeetings();
      setMeetings(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.message.includes("401")) {
          setError(
            "Потрібна авторизація (HTTP 401). Будь ласка, увійдіть через кнопку «Увійти» у верхній панелі для доступу до даних."
          );
        } else {
          setError(err.message);
        }
      } else {
        setError("Не вдалося завантажити реєстр засідань з сервера.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const auth = useAuth();

  useEffect(() => {
    if (!auth.isLoading) {
      loadMeetings();
    }
  }, [auth.isAuthenticated, auth.isLoading]);

  const handleMeetingCreated = (newMeeting: Meeting) => {
    setMeetings((prev) => {
      const updated = [...prev, newMeeting];
      return updated.sort(
        (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
      );
    });
    // Switch to registry tab after adding
    setActiveTab("registry");
  };

  // Filter meetings by search query if any
  const filteredMeetings = meetings.filter((m) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.title.toLowerCase().includes(q) ||
      m.id.toString().includes(q) ||
      m.starts_at.includes(q)
    );
  });

  return (
    <div className="max-w-[880px] mx-auto bg-white dark:bg-slate-900 border border-[#ced4da] dark:border-slate-800 shadow-sm p-6 sm:p-10 my-2">
      {/* 1. DOCUMENT HEADING & STATE EMBLEM (EXACTLY AS IN Kонституція) */}
      <div className="text-center pb-6 border-b border-neutral-300 dark:border-slate-700">
        <div className="flex justify-center mb-3">
          <img
            src="/rada_assets/gerb_kQCl.gif"
            alt="Герб України"
            className="h-20 w-auto object-contain"
            title="Державний Герб України"
          />
        </div>

        <h1 className="font-rada-serif text-2xl sm:text-3xl font-bold uppercase tracking-wider text-black dark:text-white mt-1 mb-1">
          ПОРЯДОК ДЕННИЙ ТА РЕЄСТР ЗАСІДАНЬ
        </h1>
        <h2 className="font-rada-serif text-lg sm:text-xl font-bold uppercase tracking-wide text-neutral-800 dark:text-neutral-200 mb-2">
          ВЕРХОВНОЇ РАДИ УКРАЇНИ
        </h2>

        <p className="font-rada-serif italic text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">
          (Відомості Верховної Ради України (ВВР), 2026, № 40, ст. 254)
        </p>

        <div className="mt-3 text-left font-rada-serif italic text-xs text-neutral-600 dark:text-neutral-400 bg-neutral-50 dark:bg-slate-800/60 p-3 border-l-2 border-[#184dbd] rounded-r">
          &#123;Із змінами та доповненнями, внесеними згідно з Регламентом Верховної Ради
          України, стандартами об'єктно-орієнтованого аналізу та проєктування (OOAD Module
          1) та архітектурними вимогами єдиного монорепозиторію Spry&#125;
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="my-4 p-4 rounded border border-red-300 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs sm:text-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
            <span>
              <strong>Помилка зв'язку з базою даних:</strong> {error}
            </span>
          </div>
          <button
            type="button"
            onClick={loadMeetings}
            className="px-2.5 py-1 text-xs font-semibold rounded border border-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 flex items-center gap-1"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Повторити
          </button>
        </div>
      )}

      {/* 2. TAB CONTENT OR MAIN FLOW */}
      {activeTab === "card" && (
        <div className="my-6 p-5 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded">
          <h3 className="font-rada-serif text-lg font-bold mb-3 flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#004bc1]" />
            Картка реєстру засідань Верховної Ради України
          </h3>
          <div className="text-xs sm:text-sm font-rada-serif space-y-2 text-slate-700 dark:text-slate-300 leading-relaxed">
            <p>
              <strong>Вид акта:</strong> Електронний реєстр та регламентний протокол
              засідань
            </p>
            <p>
              <strong>Суб'єкт внесення:</strong> Секретаріат Верховної Ради України /
              Система Spry
            </p>
            <p>
              <strong>Статус:</strong> Офіційний, діючий, відкритий доступ
            </p>
            <p>
              <strong>Технічна основа:</strong> FastAPI (Python 3.12) &bull; PostgreSQL 16
              &bull; React (Vite, TypeScript, Tailwind CSS)
            </p>
            <p>
              <strong>Усього записів у базі даних:</strong> {meetings.length} засідань
            </p>
          </div>
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setActiveTab("registry")}
              className="text-xs font-semibold text-[#004bc1] hover:underline"
            >
              &larr; Повернутися до переліку засідань
            </button>
          </div>
        </div>
      )}

      {activeTab === "history" && (
        <div className="my-6 p-5 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded">
          <h3 className="font-rada-serif text-lg font-bold mb-3 flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-[#004bc1]" />
            Історія змін та редакцій реєстру
          </h3>
          <ul className="text-xs sm:text-sm font-rada-serif space-y-2 text-slate-700 dark:text-slate-300 list-disc list-inside">
            <li>
              <strong>01.10.2026</strong> — Запровадження першого вертикального зрізу Spry
              Monorepo (GET/POST /api/meetings).
            </li>
            <li>
              <strong>01.01.2020</strong> — Внесення попередніх регламентних поправок.
            </li>
            <li>
              <strong>28.06.1996</strong> — Прийняття Конституції України Верховною Радою
              України.
            </li>
          </ul>
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setActiveTab("registry")}
              className="text-xs font-semibold text-[#004bc1] hover:underline"
            >
              &larr; Повернутися до реєстру засідань
            </button>
          </div>
        </div>
      )}

      {/* Section I: Registration Form */}
      <section id="create-meeting-section" className="my-6">
        <MeetingForm onMeetingCreated={handleMeetingCreated} />
      </section>

      {/* Section II: Meeting Registry List */}
      <section id="meetings-list-section" className="my-8">
        <div className="flex items-center justify-between border-b-2 border-neutral-800 dark:border-neutral-200 pb-2 mb-4">
          <div>
            <h2 className="font-rada-serif text-lg sm:text-xl font-bold uppercase tracking-wide text-black dark:text-white">
              РОЗДІЛ II. ПЕРЕЛІК ТА ПРОТОКОЛИ ЗАРЕЄСТРОВАНИХ ЗАСІДАНЬ
            </h2>
            <div className="font-rada-serif text-xs italic text-neutral-600 dark:text-neutral-400">
              Стаття 2. Офіційний хронологічний перелік пленарних засідань та нарад
            </div>
          </div>
          <button
            type="button"
            onClick={loadMeetings}
            disabled={isLoading}
            title="Оновити дані"
            className="p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-slate-800 text-neutral-600 dark:text-neutral-300 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {searchQuery.trim() && (
          <div className="mb-4 text-xs font-medium text-neutral-600 dark:text-neutral-400 bg-blue-50 dark:bg-blue-950/40 p-2.5 rounded border border-blue-200 dark:border-blue-800">
            Результати пошуку за запитом: <b>«{searchQuery}»</b> (знайдено:{" "}
            {filteredMeetings.length})
          </div>
        )}

        <MeetingList meetings={filteredMeetings} isLoading={isLoading} />
      </section>
    </div>
  );
}
