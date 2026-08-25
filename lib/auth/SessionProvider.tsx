"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { readSession, writeSession, clearSession, type MockSession, type SessionRole } from "./session";

interface SessionContextValue {
  session: MockSession | null;
  loading: boolean;
  login: (name: string, role?: SessionRole) => void;
  logout: () => void;
  setRole: (role: SessionRole) => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

interface HydrationState {
  session: MockSession | null;
  loading: boolean;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [{ session, loading }, setHydration] = useState<HydrationState>({
    session: null,
    loading: true,
  });

  useEffect(() => {
    // localStorage isn't available during SSR, so the session can only be read
    // client-side after mount — this is the one-time sync-with-external-system case.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydration({ session: readSession(), loading: false });
  }, []);

  function setSession(updater: MockSession | null | ((prev: MockSession | null) => MockSession | null)) {
    setHydration((prev) => ({
      ...prev,
      session: typeof updater === "function" ? updater(prev.session) : updater,
    }));
  }

  function login(name: string, role: SessionRole = "DOCTOR") {
    const next: MockSession = { name: name.trim() || "Demo User", role };
    writeSession(next);
    setSession(next);
  }

  function logout() {
    clearSession();
    setSession(null);
  }

  function setRole(role: SessionRole) {
    setSession((prev) => {
      if (!prev) return prev;
      const next = { ...prev, role };
      writeSession(next);
      return next;
    });
  }

  return (
    <SessionContext.Provider value={{ session, loading, login, logout, setRole }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
