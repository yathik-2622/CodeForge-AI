import { useQuery, useMutation, type UseQueryOptions } from "@tanstack/react-query";

let BASE = "";
export function setBaseUrl(url: string) { BASE = url.replace(/\/$/, ""); }

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
  id: string; title: string; model: string; status: string;
  messageCount: number; createdAt: string; updatedAt: string;
}

export interface Message {
  id: string; sessionId: string; role: "user" | "agent" | "system";
  content: string; agentType?: string; metadata?: Record<string, unknown>; createdAt: string;
}

export interface Repository {
  id: string; name: string; fullName: string; provider: string; status: string;
  description?: string; url?: string; language?: string; stars?: number;
  fileCount: number; lineCount: number;
  frameworks?: string[]; databases?: string[]; apis?: string[]; branches?: string[];
  lastAnalyzed?: string; lastScannedAt?: string; createdAt: string; updatedAt: string;
}

export interface RepositoryGraph {
  nodes: Array<{ id: string; type: string; label: string }>;
  edges: Array<{ source: string; target: string; relation: string }>;
}

export interface RepositoryAnalysis { summary: string; architecture: string; suggestions: string[]; }

export interface Deployment {
  id: string; repositoryId?: string; environment: string; platform: string; status: string;
  url?: string; branch: string; commitHash: string; createdAt: string; updatedAt: string;
}

export interface SecurityFinding {
  id: string; repositoryId: string; severity: string; category: string; status: string;
  title: string; description?: string; file?: string; line?: number;
  filePath?: string; lineNumber?: number; detectedAt: string; createdAt: string;
}

export interface SecuritySummary {
  critical: number; high: number; medium: number; low: number; info: number;
  resolved: number; total: number;
}

export interface Agent {
  id: string; type: string; status: string; model: string; sessionId?: string;
  currentTask?: string; tasksCompleted: number; createdAt: string; updatedAt: string;
}

export interface DashboardStats {
  totalSessions: number; totalRepositories: number; totalDeployments: number; activeAgents: number;
  tasksCompleted: number; tasksToday: number; securityIssues: number; criticalIssues: number;
  successfulDeployments: number; linesGenerated: number;
  agentsByStatus: Record<string, number>; repositoriesByProvider: Record<string, number>;
}

export interface ActivityEvent {
  id: string; type: string; title: string; description: string; severity?: string; createdAt: string;
}

export interface AgentMetric { date: string; coding: number; research: number; debug: number; security: number; }

export interface Execution {
  id: string; command: string; status: string; output?: string;
  exitCode?: number | null; sessionId?: string | null; durationMs?: number | null; createdAt: string;
}

export interface ModelInfo {
  id: string; label: string; provider: "openrouter" | "groq"; context: number; badge?: string;
}

// ── Query Keys ────────────────────────────────────────────────────────────────

export const getListSessionsQueryKey        = ()           => ["/api/sessions"]                   as const;
export const getGetSessionQueryKey          = (id: string) => ["/api/sessions", id]               as const;
export const getListMessagesQueryKey        = (id: string) => ["/api/sessions", id, "messages"]   as const;
export const getListRepositoriesQueryKey    = ()           => ["/api/repositories"]               as const;
export const getGetRepositoryQueryKey       = (id: string) => ["/api/repositories", id]           as const;
export const getGetRepositoryGraphQueryKey  = (id: string) => ["/api/repositories", id, "graph"] as const;
export const getListDeploymentsQueryKey     = ()           => ["/api/deployments"]                as const;
export const getListModelsQueryKey          = ()           => ["/api/models"]                     as const;
export const getListExecutionsQueryKey      = ()           => ["/api/executions"]                 as const;

// ── Sessions ──────────────────────────────────────────────────────────────────

export function useListSessions(options?: Omit<UseQueryOptions<Session[]>, "queryKey" | "queryFn">) {
  return useQuery<Session[]>({
    queryKey: getListSessionsQueryKey(),
    queryFn:  () => apiFetch<Session[]>("/api/sessions"),
    ...options,
  });
}

export function useGetSession(id?: string) {
  return useQuery<Session>({
    queryKey: getGetSessionQueryKey(id ?? ""),
    queryFn:  () => apiFetch<Session>(`/api/sessions/${id}`),
    enabled:  !!id,
  });
}

export function useCreateSession() {
  return useMutation({
    mutationFn: (body: { title: string; model: string; repositoryId?: string | null }) =>
      apiFetch<Session>("/api/sessions", { method: "POST", body: JSON.stringify(body) }),
  });
}

export function useListMessages(sessionId?: string) {
  return useQuery<Message[]>({
    queryKey: getListMessagesQueryKey(sessionId ?? ""),
    queryFn:  () => apiFetch<Message[]>(`/api/sessions/${sessionId}/messages`),
    enabled:  !!sessionId,
    refetchInterval: false,
  });
}

export function useSendMessage() {
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { content: string } }) =>
      apiFetch<Message>(`/api/sessions/${id}/messages`, { method: "POST", body: JSON.stringify(data) }),
  });
}

// ── Repositories ──────────────────────────────────────────────────────────────

export function useListRepositories() {
  return useQuery<Repository[]>({
    queryKey: getListRepositoriesQueryKey(),
    queryFn:  () => apiFetch<Repository[]>("/api/repositories"),
  });
}

export function useGetRepository(id?: string) {
  return useQuery<Repository>({
    queryKey: getGetRepositoryQueryKey(id ?? ""),
    queryFn:  () => apiFetch<Repository>(`/api/repositories/${id}`),
    enabled:  !!id,
  });
}

export function useConnectRepository() {
  return useMutation({
    mutationFn: (body: { name: string; url: string; provider: string }) =>
      apiFetch<Repository>("/api/repositories", { method: "POST", body: JSON.stringify(body) }),
  });
}

export function useGetRepositoryGraph(id?: string) {
  return useQuery<RepositoryGraph>({
    queryKey: getGetRepositoryGraphQueryKey(id ?? ""),
    queryFn:  () => apiFetch<RepositoryGraph>(`/api/repositories/${id}/graph`),
    enabled:  !!id,
  });
}

export function useScanRepository() {
  return useMutation({
    mutationFn: ({ id }: { id: string }) =>
      apiFetch<{ ok: boolean }>(`/api/repositories/${id}/scan`, { method: "POST", body: JSON.stringify({}) }),
  });
}

export function useAnalyzeRepository() {
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<RepositoryAnalysis>(`/api/repositories/${id}/analyze`, { method: "POST", body: JSON.stringify({}) }),
  });
}

// ── Deployments ───────────────────────────────────────────────────────────────

export function useListDeployments() {
  return useQuery<Deployment[]>({
    queryKey: getListDeploymentsQueryKey(),
    queryFn:  () => apiFetch<Deployment[]>("/api/deployments"),
  });
}

export function useCreateDeployment() {
  return useMutation({
    mutationFn: (body: { repositoryId?: string; environment: string; platform: string }) =>
      apiFetch<Deployment>("/api/deployments", { method: "POST", body: JSON.stringify(body) }),
  });
}

// ── Security ──────────────────────────────────────────────────────────────────

export function useListSecurityFindings(filters?: { repositoryId?: string; severity?: string }) {
  const params = new URLSearchParams();
  if (filters?.repositoryId) params.set("repositoryId", filters.repositoryId);
  if (filters?.severity)     params.set("severity",     filters.severity);
  const qs = params.toString() ? `?${params}` : "";
  return useQuery<SecurityFinding[]>({
    queryKey: ["/api/security/findings", filters],
    queryFn:  () => apiFetch<SecurityFinding[]>(`/api/security/findings${qs}`),
  });
}

export function useGetSecuritySummary() {
  return useQuery<SecuritySummary>({
    queryKey: ["/api/security/summary"],
    queryFn:  () => apiFetch<SecuritySummary>("/api/security/summary"),
  });
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export function useDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
    queryFn:  () => apiFetch<DashboardStats>("/api/dashboard/stats"),
  });
}
export function useGetDashboardStats() { return useDashboardStats(); }

export function useGetDashboardActivity() {
  return useQuery<ActivityEvent[]>({
    queryKey: ["/api/dashboard/activity"],
    queryFn:  () => apiFetch<ActivityEvent[]>("/api/dashboard/activity"),
  });
}

export function useGetAgentMetrics() {
  return useQuery<AgentMetric[]>({
    queryKey: ["/api/dashboard/metrics"],
    queryFn:  () => apiFetch<AgentMetric[]>("/api/dashboard/metrics"),
  });
}

// ── Models ────────────────────────────────────────────────────────────────────

export function useListModels() {
  return useQuery<ModelInfo[]>({
    queryKey: getListModelsQueryKey(),
    queryFn:  () => apiFetch<ModelInfo[]>("/api/models"),
    staleTime: Infinity,
  });
}

// ── Agents ────────────────────────────────────────────────────────────────────

export function useListAgents() {
  return useQuery<Agent[]>({
    queryKey: ["/api/agents"],
    queryFn:  () => apiFetch<Agent[]>("/api/agents"),
  });
}

// ── Executions ────────────────────────────────────────────────────────────────

export function useListExecutions() {
  return useQuery<Execution[]>({
    queryKey: getListExecutionsQueryKey(),
    queryFn:  () => apiFetch<Execution[]>("/api/executions"),
  });
}

export function useCreateExecution() {
  return useMutation({
    mutationFn: ({ data }: { data: { command: string; sessionId?: string } }) =>
      apiFetch<Execution>("/api/executions", { method: "POST", body: JSON.stringify(data) }),
  });
}
