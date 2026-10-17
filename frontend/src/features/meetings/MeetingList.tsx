import { useState } from "react";
import { Meeting } from "@/types/meeting";
import { formatDateTime } from "@/lib/utils";
import {
  Calendar,
  Users,
  FileCheck,
  Printer,
  Sparkles,
  ListTodo,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface MeetingListProps {
  meetings: Meeting[];
  isLoading: boolean;
  onAddNewClick?: () => void;
}

export function MeetingList({ meetings, isLoading, onAddNewClick }: MeetingListProps) {
  // Track expanded agendas for meetings that have long agendas
  const [expandedAgendas, setExpandedAgendas] = useState<Record<number, boolean>>({});

  const toggleAgenda = (id: number) => {
    setExpandedAgendas((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  if (isLoading) {
    return (
      <div className="space-y-4 my-4 font-rada-serif">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="p-5 border border-[#ced4da] dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 rounded animate-pulse space-y-3"
          >
            <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
            <div className="h-16 bg-slate-100 dark:bg-slate-700/50 rounded w-full mt-2" />
          </div>
        ))}
      </div>
    );
  }

  if (meetings.length === 0) {
    return (
      <div className="my-8 p-10 border border-dashed border-[#ced4da] dark:border-slate-700 rounded-lg text-center font-rada-serif text-neutral-600 dark:text-neutral-400 bg-neutral-50/50 dark:bg-slate-800/30">
        <FileCheck className="h-12 w-12 text-neutral-400 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-neutral-800 dark:text-neutral-200">
          Відомості про засідання у поточному реєстрі відсутні
        </h3>
        <p className="text-xs sm:text-sm mt-1.5 max-w-md mx-auto italic leading-relaxed">
          Жодного пленарного засідання або наради ще не зареєстровано за цими критеріями.
          Створіть перше засідання власноруч або скористайтеся швидким ШІ-парсером.
        </p>
        {onAddNewClick && (
          <div className="mt-5">
            <button
              type="button"
              onClick={onAddNewClick}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0e317e] hover:bg-[#184dbd] text-white text-xs font-bold uppercase tracking-wider rounded border border-[#09235c] shadow-sm transition-all hover:shadow"
            >
              <Sparkles className="h-4 w-4 text-[#ffe358]" />
              <span>+ Зареєструвати перше засідання</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  const calculateDuration = (startIso: string, endIso: string) => {
    try {
      const diffMs = new Date(endIso).getTime() - new Date(startIso).getTime();
      const diffMins = Math.round(diffMs / 60000);
      if (diffMins < 60) {
        return `${diffMins} хв`;
      }
      const hours = Math.floor(diffMins / 60);
      const remainingMins = diffMins % 60;
      return remainingMins > 0 ? `${hours} год ${remainingMins} хв` : `${hours} год`;
    } catch {
      return "—";
    }
  };

  return (
    <div className="space-y-4 my-4 font-rada-serif">
      {meetings.map((meeting, index) => {
        const isAgendaExpanded = expandedAgendas[meeting.id] ?? true;
        const hasAgenda = Boolean(meeting.agenda && meeting.agenda.trim().length > 0);
        const hasAiMetadata = Boolean(meeting.ai_suggestion);

        return (
          <article
            key={meeting.id}
            className="border border-[#ced4da] dark:border-slate-700 bg-white dark:bg-slate-800/80 p-5 rounded-lg shadow-sm hover:border-[#184dbd] dark:hover:border-blue-500 transition-colors"
          >
            {/* Article Header (Official Parliamentary Registry Style) */}
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-neutral-200 dark:border-slate-700 pb-3 mb-3">
              <div>
                <span className="font-bold text-sm sm:text-base text-black dark:text-white">
                  Стаття 2.{index + 1}. Засідання № {meeting.id}:
                </span>{" "}
                <span className="font-semibold text-sm sm:text-base text-[#004bc1] dark:text-blue-400">
                  {meeting.title}
                </span>
              </div>
              <div className="shrink-0 flex items-center gap-2">
                {hasAiMetadata && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold text-blue-800 dark:text-blue-200 border border-blue-300 dark:border-blue-800 bg-blue-50 dark:bg-blue-950 uppercase">
                    <Sparkles className="h-2.5 w-2.5 text-blue-600 dark:text-blue-400" />
                    ШІ-Асистент
                  </span>
                )}
                <span className="px-2 py-0.5 rounded text-[11px] font-bold text-[#009d3f] border border-[#009d3f] bg-[#e8f5e9] dark:bg-emerald-950 dark:text-emerald-300 uppercase">
                  Чинне / Зареєстровано
                </span>
              </div>
            </div>

            {/* Legislative Metadata Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs text-neutral-700 dark:text-neutral-300 bg-neutral-50 dark:bg-slate-900/40 p-3 rounded border border-neutral-200 dark:border-slate-700/60">
              <div className="flex items-start gap-2">
                <Calendar className="h-3.5 w-3.5 text-[#004bc1] dark:text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-[10px] font-sans uppercase tracking-wider text-neutral-500 dark:text-neutral-400 font-semibold">
                    Відкриття
                  </div>
                  <div className="font-medium text-neutral-900 dark:text-white">
                    {formatDateTime(meeting.starts_at)}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Calendar className="h-3.5 w-3.5 text-[#004bc1] dark:text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-[10px] font-sans uppercase tracking-wider text-neutral-500 dark:text-neutral-400 font-semibold">
                    Закриття
                  </div>
                  <div className="font-medium text-neutral-900 dark:text-white">
                    {formatDateTime(meeting.ends_at)}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Users className="h-3.5 w-3.5 text-[#009d3f] dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-[10px] font-sans uppercase tracking-wider text-neutral-500 dark:text-neutral-400 font-semibold">
                    Учасники (Кворум)
                  </div>
                  <div className="font-medium text-neutral-900 dark:text-white">
                    {meeting.attendee_count} народних депутатів
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <span className="font-mono text-[#004bc1] dark:text-blue-400 text-xs font-bold shrink-0 mt-0.5">
                  ⏱
                </span>
                <div>
                  <div className="text-[10px] font-sans uppercase tracking-wider text-neutral-500 dark:text-neutral-400 font-semibold">
                    Тривалість
                  </div>
                  <div className="font-medium text-neutral-900 dark:text-white">
                    {calculateDuration(meeting.starts_at, meeting.ends_at)}
                  </div>
                </div>
              </div>
            </div>

            {/* Agenda / Порядок денний Section */}
            {hasAgenda && (
              <div className="mt-3.5 pt-3 border-t border-neutral-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wide">
                    <ListTodo className="h-3.5 w-3.5 text-[#0e317e] dark:text-blue-400" />
                    <span>Порядок денний та регламентні доручення:</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleAgenda(meeting.id)}
                    className="text-[11px] font-sans text-[#004bc1] dark:text-blue-400 hover:underline flex items-center gap-0.5"
                  >
                    <span>{isAgendaExpanded ? "Згорнути" : "Розгорнути"}</span>
                    {isAgendaExpanded ? (
                      <ChevronUp className="h-3 w-3" />
                    ) : (
                      <ChevronDown className="h-3 w-3" />
                    )}
                  </button>
                </div>

                {isAgendaExpanded && (
                  <div className="text-xs sm:text-sm font-sans whitespace-pre-line text-neutral-800 dark:text-neutral-200 bg-white dark:bg-slate-900/60 p-3.5 rounded border border-neutral-200 dark:border-slate-700/80 leading-relaxed shadow-inner">
                    {meeting.agenda}
                  </div>
                )}
              </div>
            )}

            {/* Parliamentary Actions Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 mt-3 border-t border-neutral-100 dark:border-slate-700/60 text-xs font-sans">
              <div className="text-[11px] text-neutral-500 dark:text-neutral-400 font-mono">
                Реєстраційний номер: SPRY-MEET-{meeting.id}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-2.5 py-1 text-xs text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white rounded border border-neutral-300 dark:border-slate-600 hover:bg-neutral-100 dark:hover:bg-slate-700 flex items-center gap-1.5 transition-colors"
                  title="Роздрукувати офіційний витяг протоколу"
                >
                  <Printer className="h-3.5 w-3.5 text-neutral-500" />
                  <span>Друк протоколу</span>
                </button>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
