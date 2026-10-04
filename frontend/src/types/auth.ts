export interface User {
  id: number;
  email: string;
  name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface AuthCheckResponse {
  authenticated: boolean;
  user: User | null;
}
