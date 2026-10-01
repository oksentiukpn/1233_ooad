import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { createMeeting } from "@/lib/api";
import { Meeting } from "@/types/meeting";
import { PlusCircle, Loader2 } from "lucide-react";

interface MeetingFormProps {
  onMeetingCreated: (meeting: Meeting) => void;
}

export function MeetingForm({ onMeetingCreated }: MeetingFormProps) {
  const [title, setTitle] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [attendeeCount, setAttendeeCount] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Title is required.");
      return;
    }

    if (!startsAt || !endsAt) {
      setError("Both start and end dates/times are required.");
      return;
    }

    const startDate = new Date(startsAt);
    const endDate = new Date(endsAt);

    if (endDate <= startDate) {
      setError("End time must be strictly after start time.");
      return;
    }

    if (attendeeCount < 0) {
      setError("Attendee count cannot be negative.");
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

      // Reset form
      setTitle("");
      setStartsAt("");
      setEndsAt("");
      setAttendeeCount(1);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to create meeting.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <PlusCircle className="h-5 w-5 text-primary" />
          Schedule a Meeting
        </CardTitle>
        <CardDescription>
          Record a new meeting slice with time window and expected attendee count.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/15 border border-destructive/20 p-3 text-sm text-destructive font-medium">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="title">Meeting Title</Label>
            <Input
              id="title"
              placeholder="e.g. Weekly Product Sync"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="starts_at">Starts At</Label>
              <Input
                id="starts_at"
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ends_at">Ends At</Label>
              <Input
                id="ends_at"
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="attendee_count">Attendee Count</Label>
            <Input
              id="attendee_count"
              type="number"
              min={0}
              value={attendeeCount}
              onChange={(e) => setAttendeeCount(parseInt(e.target.value, 10) || 0)}
              required
              disabled={isSubmitting}
            />
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving Meeting...
              </>
            ) : (
              "Add Meeting"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
