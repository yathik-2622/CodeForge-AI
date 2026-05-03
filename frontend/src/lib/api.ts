import {
  useQuery,
  useMutation,
  type UseQueryOptions,
} from "@tanstack/react-query";

const BASE = "";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => `HTTP ${res.status}`);
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Session {
  id: string;
  title: string;
  model: string;
  status: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  sessionId: string;
  role: "user" | "agent" | "system";
  content: string;
  agentType?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface Repository {
  id: string;
  name: string;
  fullName: string;
  provider: string;
  status: string;
  description?: string;
  url?: string;
  language?: string;
  stars?: number;
  lastAnalyzed?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Deployment {
  id: string;
  repositoryId?: string;
  environment: string;
  platform: string;
  status: string;
  url?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SecurityFinding {
  id: string;
  repositoryId: string;
  severity: string;
  category: string;
  status: string;
  title: string;
  description?: string;
  filePath?: string;
  lineNumber?: number;
  createdAt: string;
}

export interface Agent {
  id: string;
  type: string;
  status: string;
  model: string;
  sessionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  totalSessions: number;
  totalRepositories: number;
  totalDeployments: number;
  activeAgents: number;
  agentsByStatus: Record<string, number>;
  repositoriesByProvider: Record<string, number>;
}

export interface ModelInfo {
  id: string;
  label: string;
  provider: "openrouter" | "groq";
  context: number;
  badge?: string;
}

// ── Query Keys ────────────────────────────────────────────────────────────────

export const getListSessionsQueryKey    = ()         => ["/api/sessions"]          as const;
export const getListRepositoriesQueryKey = ()        => ["/api/repositories"]      as const;
export const getListDeploymentsQueryKey  = ()        => ["/api/deployments"]       as const;
export const getListModelsQueryKey       = ()        => ["/api/models"]            as const;

// ── Sessions ──────────────────────────────────────────────────────────────────

export function useListSessions(options?: Omit<UseQueryOptions<Session[]>, "queryKey" | "queryFn">) {
  return useQuery<Session[]>({
    queryKey: getListSessionsQueryKey(),
    queryFn: () => apiFetch<Session[]>("/api/sessions"),
    ...options,
  });
}

export function useGetSession(id: string) {
  return useQuery<Session>({
    queryKey: ["/api/sessions", id],
    queryFn: () => apiFetch<Session>(`/api/sessions/${id}`),
    enabled: !!id,
  });
}

export function useCreateSession() {
  return useMutation({
    mutationFn: (body: { title: string; model: string; repositoryId?: string | null }) =>
      apiFetch<Session>("/api/sessions", { method: "POST", body: JSON.stringify(body) }),
  });
}

export function useListMessages(sessionId: string) {
  return useQuery<Message[]>({
    queryKey: ["/api/sessions", sessionId, "messages"],
    queryFn: () => apiFetch<Message[]>(`/api/sessions/${sessionId}/messages`),
    enabled: !!sessionId,
    refetchInterval: false,
  });
}

export function useSendMessage(sessionId: string) {
  return useMutation({
    mutationFn: (content: string) =>
      apiFetch<Message>(`/api/sessions/${sessionId}/messages`, {
        method: "POST",
        body: JSON.stringify({ content }),
      }),
  });
}

// ── Repositories ──────────────────────────────────────────────────────────────

export function useListRepositories() {
  return useQuery<Repository[]>({
    queryKey: getListRepositoriesQueryKey(),
    queryFn: () => apiFetch<Repository[]>("/api/repositories"),
  });
}

export function useGetRepository(id: string) {
  return useQuery<Repository>({
    queryKey: ["/api/repositories", id],
    queryFn: () => apiFetch<Repository>(`/api/repositories/${id}`),
    enabled: !!id,
  });
}

export function useConnectRepository() {
  return useMutation({
    mutationFn: (body: { name: string; url: string; provider: string }) =>
      apiFetch<Repository>("/api/repositories", { method: "POST", body: JSON.stringify(body) }),
  });
}

// ── Deployments ───────────────────────────────────────────────────────────────

export function useListDeployments() {
  return useQuery<Deployment[]>({
    queryKey: getListDeploymentsQueryKey(),
    queryFn: () => apiFetch<Deployment[]>("/api/deployments"),
  });
}

export function useCreateDeployment() {
  return useMutation({
    mutationFn: (body: { repositoryId?: string; environment: string; platform: string }) =>
      apiFetch<Deployment>("/api/deployments", { method: "POST", body: JSON.stringify(body) }),
  });
}

// ── Security ──────────────────────────────────────────────────────────────────

export function useListSecurityFindings(filters?: { severity?: string }) {
  const params = filters?.severity ? `?severity=${filters.severity}` : "";
  return useQuery<SecurityFinding[]>({
    queryKey: ["/api/security/findings", filters],
    queryFn: () => apiFetch<SecurityFinding[]>(`/api/security/findings${params}`),
  });
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export function useDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
    queryFn: () => apiFetch<DashboardStats>("/api/dashboard/stats"),
  });
}

// ── Models ────────────────────────────────────────────────────────────────────

export function useListModels() {
  return useQuery<ModelInfo[]>({
    queryKey: getListModelsQueryKey(),
    queryFn: () => apiFetch<ModelInfo[]>("/api/models"),
    staleTime: Infinity,
  });
}

// ── Agents ────────────────────────────────────────────────────────────────────

export function useListAgents() {
  return useQuery<Agent[]>({
    queryKey: ["/api/agents"],
    queryFn: () => apiFetch<Agent[]>("/api/agents"),
  });
}
