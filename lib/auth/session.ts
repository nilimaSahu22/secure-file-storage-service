export type SessionRole = "DOCTOR" | "NURSE" | "ADMIN";

export interface MockSession {
  name: string;
  role: SessionRole;
}

const STORAGE_KEY = "ehr-demo-session";

export function readSession(): MockSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as MockSession;
  } catch {
    return null;
  }
}

export function writeSession(session: MockSession): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  window.localStorage.removeItem(STORAGE_KEY);
}
