"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

interface AssistantState {
  open: boolean;
  full: boolean;
  threadId: string | null;
  /** Bumped whenever a fresh conversation is requested, so the view can remount. */
  seq: number;
}

interface AssistantContextValue extends AssistantState {
  openThread: (id: string) => void;
  openNew: () => void;
  openDocked: () => void;
  setFull: (full: boolean) => void;
  toggleFull: () => void;
  close: () => void;
}

const AssistantContext = createContext<AssistantContextValue | null>(null);

export function useAssistant(): AssistantContextValue {
  const ctx = useContext(AssistantContext);
  if (!ctx) throw new Error("useAssistant must be used within <AssistantProvider>");
  return ctx;
}

export function AssistantProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AssistantState>({ open: false, full: false, threadId: null, seq: 0 });

  const openThread = useCallback(
    (id: string) => setState((p) => ({ open: true, full: true, threadId: id, seq: p.seq + 1 })),
    []
  );
  const openNew = useCallback(
    () => setState((p) => ({ open: true, full: true, threadId: null, seq: p.seq + 1 })),
    []
  );
  const openDocked = useCallback(() => setState((p) => ({ ...p, open: true, full: false })), []);
  const setFull = useCallback((full: boolean) => setState((p) => ({ ...p, full })), []);
  const toggleFull = useCallback(() => setState((p) => ({ ...p, full: !p.full })), []);
  const close = useCallback(() => setState((p) => ({ ...p, open: false, full: false, threadId: null })), []);

  const value = useMemo(
    () => ({ ...state, openThread, openNew, openDocked, setFull, toggleFull, close }),
    [state, openThread, openNew, openDocked, setFull, toggleFull, close]
  );

  return <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>;
}
