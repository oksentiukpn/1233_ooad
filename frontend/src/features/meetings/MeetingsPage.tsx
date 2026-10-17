import { useEffect, useState } from "react";
import { useAuth } from "react-oidc-context";
import { Meeting } from "@/types/meeting";
import { fetchMeetings } from "@/lib/api";
import { MeetingForm } from "./MeetingForm";
import { MeetingList } from "./MeetingList";
import { AlertTriangle, RefreshCw, Sparkles, ListFilter, Plus } from "lucide-react";

interface MeetingsPageProps {
  searchQuery?: string;
  activeTab: "registry" | "create";
  setActiveTab: (tab: "registry" | "create") => void;
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
            "Потрібна авторизація (HTTP 401). Будь ласка, увійдіть через кнопку «Увійти» (Sign in) для перегляду засідань."
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
      const updated = [newMeeting, ...prev.filter((m) => m.id !== newMeeting.id)];
      return updated.sort(
        (a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime()
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
      (m.agenda && m.agenda.toLowerCase().includes(q)) ||
      m.starts_at.includes(q)
    );
  });

  return (
    <div className="max-w-[960px] mx-auto bg-white dark:bg-slate-900 border border-[#ced4da] dark:border-slate-800 shadow-sm p-5 sm:p-8 rounded-lg my-3">
      {/* 1. DOCUMENT HEADING & STATE EMBLEM (AUTHENTIC PARLIAMENTARY HEADER) */}
      <div className="text-center pb-5 border-b border-neutral-300 dark:border-slate-700">
        <div className="flex justify-center mb-2.5">
          <img
            src="/rada_assets/gerb_kQCl.gif"
            alt="Герб України"
            className="h-16 sm:h-20 w-auto object-contain"
            title="Державний Герб України"
          />
        </div>

        <h1 className="font-rada-serif text-xl sm:text-2xl font-bold uppercase tracking-wider text-black dark:text-white mt-1 mb-1">
          ЄДИНИЙ ДЕРЖАВНИЙ РЕЄСТР ЗАСІДАНЬ ТА ПОРЯДКУ ДЕННОГО
        </h1>
        <h2 className="font-rada-serif text-base sm:text-lg font-bold uppercase tracking-wide text-neutral-800 dark:text-neutral-200 mb-1.5">
          ВЕРХОВНОЇ РАДИ УКРАЇНИ
        </h2>

        <p className="font-rada-serif italic text-xs text-neutral-600 dark:text-neutral-400">
          (Офіційний електронний протокол засідань • Інтегровано модуль ШІ Amazon Bedrock)
        </p>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="my-4 p-4 rounded-lg border border-red-300 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs sm:text-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
            <span>
              <strong>Помилка зв'язку з базою даних:</strong> {error}
            </span>
          </div>
          <button
            type="button"
            onClick={loadMeetings}
            className="px-2.5 py-1 text-xs font-semibold rounded border border-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 flex items-center gap-1 shrink-0"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Повторити
          </button>
        </div>
      )}

      {/* Mode Switching Tabs */}
      <div className="flex items-center justify-between border-b border-neutral-200 dark:border-slate-700 mt-5 mb-6">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("registry")}
            className={`px-4 py-2 font-bold text-xs sm:text-sm border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "registry"
                ? "border-[#0e317e] text-[#0e317e] dark:border-blue-400 dark:text-blue-400"
                : "border-transparent text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white"
            }`}
          >
            <ListFilter className="h-4 w-4" />
            <span>Реєстр засідань</span>
            <span className="text-[11px] px-1.5 py-0.2 bg-neutral-200 dark:bg-slate-700 rounded-full font-sans">
              {meetings.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("create")}
            className={`px-4 py-2 font-bold text-xs sm:text-sm border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "create"
                ? "border-[#0e317e] text-[#0e317e] dark:border-blue-400 dark:text-blue-400"
                : "border-transparent text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white"
            }`}
          >
            <Sparkles className="h-4 w-4 text-[#184dbd] dark:text-blue-400" />
            <span>+ Зареєструвати засідання</span>
          </button>
        </div>

        {activeTab === "registry" && (
          <div className="flex items-center gap-2 pb-1">
            <button
              type="button"
              onClick={loadMeetings}
              disabled={isLoading}
              title="Оновити дані"
              className="p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-slate-800 text-neutral-600 dark:text-neutral-300 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("create")}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0e317e] hover:bg-[#184dbd] text-white text-xs font-semibold rounded shadow-sm transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Додати засідання</span>
            </button>
          </div>
        )}
      </div>

      {/* 2. TAB CONTENT: REGISTRY OR CREATE FORM */}
      {activeTab === "create" ? (
        <section id="create-meeting-section">
          <MeetingForm
            onMeetingCreated={handleMeetingCreated}
            onCancel={() => setActiveTab("registry")}
          />
        </section>
      ) : (
        <section id="meetings-list-section">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div>
              <h2 className="font-rada-serif text-base sm:text-lg font-bold uppercase tracking-wide text-black dark:text-white">
                РОЗДІЛ II. ПЕРЕЛІК ТА ПРОТОКОЛИ ЗАРЕЄСТРОВАНИХ ЗАСІДАНЬ
              </h2>
              <div className="font-rada-serif text-xs italic text-neutral-600 dark:text-neutral-400">
                Стаття 2. Офіційний хронологічний перелік пленарних засідань та нарад
              </div>
            </div>

            {searchQuery.trim() && (
              <div className="text-xs font-medium text-neutral-700 dark:text-neutral-300 bg-blue-50 dark:bg-blue-950/40 px-3 py-1.5 rounded border border-blue-200 dark:border-blue-800">
                Знайдено: <b>{filteredMeetings.length}</b> за запитом «{searchQuery}»
              </div>
            )}
          </div>

          <MeetingList
            meetings={filteredMeetings}
            isLoading={isLoading}
            onAddNewClick={() => setActiveTab("create")}
          />
        </section>
      )}
    </div>
  );
}
