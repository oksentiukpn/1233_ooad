import { Meeting, MeetingCreate } from "@/types/meeting";

// Step 4: The browser calls the API directly via baked-in Function URL or NEXT_PUBLIC_API_BASE_URL
const rawBase =
  import.meta.env.VITE_API_URL ||
  import.meta.env.NEXT_PUBLIC_API_BASE_URL ||
  "";

const API_BASE = rawBase
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
      const errorText = await response.text();
      if (errorText) errorMessage = errorText;
    }
    throw new Error(errorMessage);
  }

  return response.json();
}
