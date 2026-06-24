import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { getMe, loginJson } from "./api";
import type { User } from "./types";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("tinnicore_token"));

  useEffect(() => {
    if (token) {
      localStorage.setItem("tinnicore_token", token);
    } else {
      localStorage.removeItem("tinnicore_token");
    }
  }, [token]);

  const meQuery = useQuery({
    queryKey: ["me", token],
    queryFn: getMe,
    enabled: Boolean(token),
    retry: false,
  });

  const value = useMemo<AuthContextValue>(
    () => ({
      user: token ? meQuery.data ?? null : null,
      loading: Boolean(token) && meQuery.isLoading,
      signIn: async (username, password) => {
        const data = await loginJson(username, password);
        setToken(data.access_token);
      },
      signOut: () => setToken(null),
    }),
    [token, meQuery.data, meQuery.isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
