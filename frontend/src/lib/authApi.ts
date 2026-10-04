import { User, AuthCheckResponse } from "@/types/auth";

const rawBase = import.meta.env.VITE_API_URL || "";
const API_BASE =
  rawBase && !rawBase.includes("1233.pp.ua")
    ? `${rawBase.replace(/\/$/, "")}/api`
    : "/api";

export async function fetchCurrentUser(): Promise<User | null> {
  try {
    const response = await fetch(`${API_BASE}/auth/check`, {
      headers: {
        Accept: "application/json",
      },
      credentials: "include",
    });

    if (!response.ok) {
      return null;
    }

    const data: AuthCheckResponse = await response.json();
    return data.authenticated ? data.user : null;
  } catch (err) {
    console.error("Failed to check auth state:", err);
    return null;
  }
}

export async function logoutUser(): Promise<void> {
  await fetch(`${API_BASE}/auth/logout`, {
    method: "POST",
    headers: {
      Accept: "application/json",
    },
    credentials: "include",
  });
}

export function getGoogleLoginUrl(): string {
  return `${API_BASE}/auth/google/login`;
}
