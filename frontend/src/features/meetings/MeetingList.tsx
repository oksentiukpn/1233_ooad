import { Meeting } from "@/types/meeting";
import { formatDateTime } from "@/lib/utils";
import { Calendar, Users, FileCheck, Printer, ExternalLink } from "lucide-react";

interface MeetingListProps {
  meetings: Meeting[];
  isLoading: boolean;
}

export function MeetingList({ meetings, isLoading }: MeetingListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4 my-4 font-rada-serif">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="p-4 border border-[#ced4da] dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 rounded animate-pulse space-y-2"
          >
            <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
          </div>
        ))}
      </div>
    );
  }

  if (meetings.length === 0) {
    return (
      <div className="my-6 p-8 border border-dashed border-[#ced4da] dark:border-slate-700 rounded text-center font-rada-serif text-neutral-600 dark:text-neutral-400">
        <FileCheck className="h-10 w-10 text-neutral-400 mx-auto mb-2" />
        <h3 className="text-base font-bold text-neutral-800 dark:text-neutral-200">
          Відомості про засідання у поточному реєстрі відсутні
        </h3>
        <p className="text-xs sm:text-sm mt-1 max-w-md mx-auto italic">
          Жодного пленарного засідання або наради ще не зареєстровано.
          Заповніть реєстраційну картку у Розділі I для внесення запису до бази даних.
        </p>
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
      {meetings.map((meeting, index) => (
        <article
          key={meeting.id}
          className="border border-[#ced4da] dark:border-slate-700 bg-white dark:bg-slate-800/80 p-4 sm:p-5 rounded shadow-sm hover:border-[#184dbd] transition-colors"
        >
          {/* Article Header (Like Law Articles on rada.gov.ua) */}
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-neutral-200 dark:border-slate-700 pb-2 mb-3">
            <div>
              <span className="font-bold text-sm sm:text-base text-black dark:text-white">
                Стаття 2.{index + 1}. Засідання № {meeting.id}:
              </span>{" "}
              <span className="font-semibold text-sm sm:text-base text-[#004bc1] dark:text-blue-400">
                {meeting.title}
              </span>
            </div>
            <div className="shrink-0 flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded text-[11px] font-bold text-[#009d3f] border border-[#009d3f] bg-[#e8f5e9] dark:bg-emerald-950 dark:text-emerald-300 uppercase">
                Чинне / Зареєстровано
              </span>
            </div>
          </div>

          {/* Legislative Metadata Table */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm text-neutral-700 dark:text-neutral-300">
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-neutral-500 shrink-0" />
              <span>
                <strong>Відкриття:</strong> {formatDateTime(meeting.starts_at)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-neutral-500 shrink-0" />
              <span>
                <strong>Закриття:</strong> {formatDateTime(meeting.ends_at)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Users className="h-3.5 w-3.5 text-neutral-500 shrink-0" />
              <span>
                <strong>Кворум та учасники:</strong> {meeting.attendee_count} народних депутатів
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-mono text-neutral-400">#</span>
              <span>
                <strong>Розрахункова тривалість:</strong> {calculateDuration(meeting.starts_at, meeting.ends_at)}
              </span>
            </div>
          </div>

          {/* Parliamentary Actions Footer */}
          <div className="flex flex-wrap items-center gap-3 pt-3 mt-3 border-t border-dashed border-neutral-200 dark:border-slate-700 text-xs font-sans">
            <button
              type="button"
              onClick={() => alert(`Картка засідання №${meeting.id} від ${formatDateTime(meeting.starts_at)}.`)}
              className="text-[#004bc1] hover:underline flex items-center gap-1 font-medium"
            >
              <ExternalLink className="h-3 w-3" />
              <span>Картка засідання</span>
            </button>
            <span className="text-neutral-300 dark:text-neutral-600">&bull;</span>
            <button
              type="button"
              onClick={() => alert(`Стенограма засідання №${meeting.id} відкрита для ознайомлення.`)}
              className="text-[#004bc1] hover:underline font-medium"
            >
              Стенограма
            </button>
            <span className="text-neutral-300 dark:text-neutral-600">&bull;</span>
            <button
              type="button"
              onClick={() => alert(`Витяг із протоколу №${meeting.id} згенеровано.`)}
              className="text-[#004bc1] hover:underline font-medium"
            >
              Витяг з протоколу
            </button>
            <span className="text-neutral-300 dark:text-neutral-600">&bull;</span>
            <button
              type="button"
              onClick={() => window.print()}
              className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white flex items-center gap-1 font-medium ml-auto"
            >
              <Printer className="h-3 w-3" />
              <span>Друкувати протокол</span>
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
