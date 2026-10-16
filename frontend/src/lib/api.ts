import {
  Meeting,
  MeetingAgendaUpdate,
  MeetingCreate,
  ParseAgendaResponse,
} from "@/types/meeting";
import { getAccessToken } from "./authApi";

// The browser calls the API directly via baked-in Function URL or NEXT_PUBLIC_API_BASE_URL
const rawBase =
  import.meta.env.VITE_API_URL || import.meta.env.NEXT_PUBLIC_API_BASE_URL || "";

const API_BASE = rawBase ? `${rawBase.replace(/\/$/, "")}/api` : "/api";

// Dedicated Lambda Function URL for agenda parser outside VPC ($0 idle cost)
const rawParserUrl =
  import.meta.env.VITE_AGENDA_PARSER_URL ||
  "https://7gpgni7udgcs7ska552xppw6f40dghjv.lambda-url.us-east-1.on.aws/";
const AGENDA_PARSER_URL = rawParserUrl.replace(/\/$/, "");

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  const token = getAccessToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

export async function fetchMeetings(): Promise<Meeting[]> {
  const headers = getAuthHeaders();
  const response = await fetch(`${API_BASE}/meetings`, {
    headers,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to fetch meetings (HTTP ${response.status}): ${errorBody}`);
  }

  return response.json();
}

export async function createMeeting(data: MeetingCreate): Promise<Meeting> {
  const headers = getAuthHeaders();
  headers["Content-Type"] = "application/json";

  const response = await fetch(`${API_BASE}/meetings`, {
    method: "POST",
    headers,
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

export async function saveMeetingAgenda(
  meetingId: number,
  data: MeetingAgendaUpdate
): Promise<Meeting> {
  const headers = getAuthHeaders();
  headers["Content-Type"] = "application/json";

  const response = await fetch(`${API_BASE}/meetings/${meetingId}/agenda`, {
    method: "POST",
    headers,
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to save agenda (HTTP ${response.status}): ${errorText}`);
  }

  return response.json();
}

export async function parseAgendaText(
  text: string,
  signal?: AbortSignal
): Promise<ParseAgendaResponse> {
  const headers = getAuthHeaders();
  headers["Content-Type"] = "application/json";

  const today = new Date().toISOString().split("T")[0];
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Kyiv";

  const response = await fetch(AGENDA_PARSER_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({
      text,
      today,
      tz,
    }),
    signal,
  });

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`;
    try {
      const errorJson = await response.json();
      if (typeof errorJson.detail === "string") {
        errorMessage = errorJson.detail;
      } else if (errorJson.error) {
        errorMessage = errorJson.error;
      }
    } catch {
      const errorText = await response.text();
      if (errorText) errorMessage = errorText;
    }
    throw new Error(errorMessage);
  }

  return response.json();
}
