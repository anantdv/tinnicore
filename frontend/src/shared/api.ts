import axios from "axios";
import type { DashboardSummary, User } from "./types";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("tinnicore_token");
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export async function login(username: string, password: string) {
  const body = new URLSearchParams();
  body.set("username", username);
  body.set("password", password);
  const { data } = await api.post("/auth/login", body, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  return data as { access_token: string; refresh_token: string; token_type: string };
}

export async function loginJson(username: string, password: string) {
  const { data } = await api.post("/auth/login-json", { username, password });
  return data as { access_token: string; refresh_token: string; token_type: string };
}

export async function getMe(): Promise<User> {
  const { data } = await api.get("/auth/me");
  return data as User;
}

export async function getDashboard(): Promise<DashboardSummary> {
  const { data } = await api.get("/dashboard/summary");
  return data as DashboardSummary;
}

export async function getList<T = unknown>(path: string): Promise<T> {
  const { data } = await api.get(path);
  return data as T;
}

export async function createRecord<T>(path: string, payload: unknown): Promise<T> {
  const { data } = await api.post(path, payload);
  return data as T;
}

export async function updateRecord<T>(path: string, payload: unknown): Promise<T> {
  const { data } = await api.patch(path, payload);
  return data as T;
}

export async function deleteRecord(path: string): Promise<void> {
  await api.delete(path);
}

export default api;
