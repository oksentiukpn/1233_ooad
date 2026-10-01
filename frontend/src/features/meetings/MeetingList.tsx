import { Meeting } from "@/types/meeting";
import { formatDateTime } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Users, CalendarX2 } from "lucide-react";

interface MeetingListProps {
  meetings: Meeting[];
  isLoading: boolean;
}

export function MeetingList({ meetings, isLoading }: MeetingListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className="h-24 rounded-lg border border-border bg-card animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (meetings.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <CalendarX2 className="h-12 w-12 text-muted-foreground mb-3" />
          <h3 className="text-lg font-semibold">No meetings scheduled</h3>
          <p className="text-sm text-muted-foreground max-w-sm mt-1">
            There are no meetings on record yet. Use the form above to add your
            first meeting to the schedule.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {meetings.map((meeting) => (
        <Card key={meeting.id} className="transition-shadow hover:shadow-md">
          <CardHeader className="py-4">
            <div className="flex items-center justify-between gap-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary shrink-0" />
                <span>{meeting.title}</span>
              </CardTitle>
              <Badge variant="secondary" className="flex items-center gap-1 shrink-0">
                <Users className="h-3 w-3" />
                <span>
                  {meeting.attendee_count}{" "}
                  {meeting.attendee_count === 1 ? "attendee" : "attendees"}
                </span>
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-4">
            <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                <span>
                  {formatDateTime(meeting.starts_at)} &rarr;{" "}
                  {formatDateTime(meeting.ends_at)}
                </span>
              </div>
              <span className="text-xs text-muted-foreground/60 font-mono">
                ID #{meeting.id}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
