import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { apiClient, setAccessToken } from "../lib/apiClient";
import type { PublicUser } from "../types/auth";

interface AuthContextValue {
  user: PublicUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function bootstrap() {
      try {
        const refreshRes = await apiClient.post<{ accessToken: string }>("/api/auth/refresh");
        setAccessToken(refreshRes.data.accessToken);
        const meRes = await apiClient.get<{ user: PublicUser }>("/api/auth/me");
        setUser(meRes.data.user);
      } catch {
        setAccessToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    bootstrap();
  }, []);

  async function login(email: string, password: string) {
    const res = await apiClient.post<{ accessToken: string; user: PublicUser }>(
      "/api/auth/login",
      { email, password }
    );
    setAccessToken(res.data.accessToken);
    setUser(res.data.user);
  }

  async function register(email: string, password: string, name?: string) {
    const res = await apiClient.post<{ accessToken: string; user: PublicUser }>(
      "/api/auth/register",
      { email, password, name }
    );
    setAccessToken(res.data.accessToken);
    setUser(res.data.user);
  }

  async function logout() {
    await apiClient.post("/api/auth/logout");
    setAccessToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
