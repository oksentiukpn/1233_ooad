import { MeetingsPage } from "@/features/meetings/MeetingsPage";
import { CalendarRange, Sparkles } from "lucide-react";

export function App() {
  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col font-sans">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg shadow-sm">
              <CalendarRange className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight">Spry</span>
                <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  <Sparkles className="h-3 w-3" />
                  First Slice
                </span>
              </div>
              <p className="text-xs text-muted-foreground hidden sm:block">
                Meeting Analytics & Deep-Work Platform for Teams
              </p>
            </div>
          </div>
          <div className="text-xs text-muted-foreground font-mono">
            FastAPI + React Monorepo
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
        <MeetingsPage />
      </main>

      <footer className="border-t bg-background py-6 mt-auto">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground gap-2">
          <span>Spry Architecture &mdash; OOAD Module 1</span>
          <span>Docker Compose: postgres &bull; backend &bull; frontend</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
