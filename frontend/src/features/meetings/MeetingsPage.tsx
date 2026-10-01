import { useEffect, useState } from "react";
import { Meeting } from "@/types/meeting";
import { fetchMeetings } from "@/lib/api";
import { MeetingForm } from "./MeetingForm";
import { MeetingList } from "./MeetingList";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MeetingsPage() {
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
        setError(err.message);
      } else {
        setError("Failed to load meetings from the server.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMeetings();
  }, []);

  const handleMeetingCreated = (newMeeting: Meeting) => {
    // Insert into list maintaining starts_at ascending order
    setMeetings((prev) => {
      const updated = [...prev, newMeeting];
      return updated.sort(
        (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
      );
    });
  };

  return (
    <div className="space-y-8">
      {error && (
        <div className="flex items-center justify-between rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-destructive">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span className="text-sm font-medium">{error}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadMeetings}
            className="border-destructive/30 hover:bg-destructive/10"
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Retry
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-5 lg:sticky lg:top-8">
          <MeetingForm onMeetingCreated={handleMeetingCreated} />
        </div>

        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight">Upcoming Meetings</h2>
              <p className="text-sm text-muted-foreground">
                Live schedule retrieved from the backend API
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadMeetings}
              disabled={isLoading}
              className="text-muted-foreground hover:text-foreground"
            >
              <RefreshCw
                className={`h-4 w-4 mr-1.5 ${isLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>

          <MeetingList meetings={meetings} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
}
