export interface AgendaItem {
  topic: string;
  owner?: string | null;
  minutes?: number | null;
}

export interface ActionItem {
  task: string;
  owner?: string | null;
  due?: string | null;
}

export interface ParsedAgenda {
  title?: string | null;
  starts_at?: string | null;
  duration_minutes?: number | null;
  items: AgendaItem[];
  action_items?: ActionItem[];
  language: string;
}

export interface ParseAgendaResponse {
  agenda: ParsedAgenda;
  model: string;
  prompt_version: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
  latency_ms?: number;
  cost_usd?: number;
}

export interface Meeting {
  id: number;
  title: string;
  starts_at: string;
  ends_at: string;
  attendee_count: number;
  agenda?: string | null;
  ai_suggestion?: Record<string, unknown> | null;
}

export interface MeetingCreate {
  title: string;
  starts_at: string;
  ends_at: string;
  attendee_count: number;
  agenda?: string | null;
  ai_suggestion?: Record<string, unknown> | null;
}

export interface MeetingAgendaUpdate {
  agenda: string;
  ai_suggestion?: Record<string, unknown> | null;
}

export interface ApiError {
  detail?: string | Array<{ loc: string[]; msg: string; type: string }>;
}
