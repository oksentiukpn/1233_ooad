import { Meeting, MeetingCreate } from "@/types/meeting";

// Use same-origin /api reverse-proxy when on 1233.pp.ua to eliminate CORS issues entirely
const rawBase = import.meta.env.VITE_API_URL || "";
const API_BASE = (rawBase && !rawBase.includes("1233.pp.ua"))
  ? `${rawBase.replace(/\/$/, "")}/api`
  : "/api";

export async function fetchMeetings(): Promise<Meeting[]> {
  const response = await fetch(`${API_BASE}/meetings`, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to fetch meetings (HTTP ${response.status}): ${errorBody}`);
  }

  return response.json();
}

export async function createMeeting(data: MeetingCreate): Promise<Meeting> {
  const response = await fetch(`${API_BASE}/meetings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`;
    try {
      const errorJson = await response.json();
      if (Array.isArray(errorJson.detail)) {
        errorMessage = errorJson.detail.map((d: { msg: string }) => d.msg).join("; ");
      } else if (typeof errorJson.detail === "string") {
        errorMessage = errorJson.detail;
      }
    } catch {
      errorMessage = await response.text();
    }
    throw new Error(errorMessage || "Failed to create meeting");
  }

  return response.json();
}
