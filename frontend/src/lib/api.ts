/**
 * CodeForge AI — API client + React Query hooks
 * Replaces @workspace/api-client-react in the standalone frontend.
 */
import { useQuery, useMutation } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";

// ─── Base URL ────────────────────────────────────────────────────────────────
let _base = "";
export function setBaseUrl(url: string | null) {
  _base = url ? url.replace(/\/+$/, "") : "";
}

// ─── Core fetch ──────────────────────────────────────────────────────────────
async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${_base}${url}`, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  if (!res.ok) {
    let err: any = { error: res.statusText };
    try { err = await res.json(); } catch {}
    throw Object.assign(new Error(err.error || `HTTP ${res.status}`), { status: res.status, data: err });
  }
  if (res.status === 204) return null as T;
  return res.json();
}

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════
export interface Session {
  id: string; title: string; repositoryId: string | null;
  status: string; model: string; messageCount: number;
  createdAt: string; updatedAt: string;
}
export interface Message {
  id: string; sessionId: string; role: string; content: string;
  agentType?: string | null; metadata?: Record<string, any> | null; createdAt: string;
}
export interface Repository {
  id: string; name: string; fullName: string; provider: string; url: string;
  language: string; status: string; lastScannedAt?: string | null;
  fileCount: number; lineCount: number; frameworks: string[]; createdAt: string;
}
export interface RepositoryDetail extends Repository {
  description: string; branches: string[]; dependencies: string[];
  apis: string[]; databases: string[]; cicdPlatform?: string | null;
}
export interface Agent {
  id: string; type: string; status: string; currentTask?: string | null;
  tasksCompleted: number; sessionId?: string | null; lastActiveAt: string;
}
export interface Deployment {
  id: string; repositoryId: string; environment: string; platform: string;
  status: string; version: string; branch: string; commitHash: string;
  deployedBy: string; durationMs?: number | null;
  createdAt: string; completedAt?: string | null;
}
export interface SecurityFinding {
  id: string; repositoryId: string; title: string; description: string;
  severity: string; category: string; file?: string | null; line?: number | null;
  status: string; detectedAt: string;
}
export interface SecuritySummary {
  total: number; open: number; resolved: number; dismissed: number;
  bySeverity: Record<string, number>; byCategory: Record<string, number>;
}
export interface Execution {
  id: string; command: string; status: string; output: string;
  exitCode?: number | null; sessionId?: string | null;
  durationMs?: number | null; createdAt: string;
}
export interface DashboardStats {
  totalRepositories: number; activeAgents: number; tasksCompleted: number;
  tasksToday: number; securityIssues: number; criticalIssues: number;
  successfulDeployments: number; linesGenerated: number;
  repositoriesByProvider: Record<string, number>;
  agentsByStatus: Record<string, number>;
}
export interface ActivityItem {
  id: string; type: string; title: string; description: string;
  repositoryId?: string | null; repositoryName?: string | null;
  agentType?: string | null; severity?: string | null; createdAt: string;
}
export interface AgentMetric {
  date: string; tasksCompleted: number; linesGenerated: number; issuesFixed: number;
}
export interface RepositoryAnalysis {
  summary: string; architecture: string;
  suggestions: string[]; filesAnalyzed: number;
}

// ═══════════════════════════════════════════════════════════════════════
// SESSIONS
// ═══════════════════════════════════════════════════════════════════════
export const getListSessionsQueryKey = () => ["/api/sessions"] as const;
export function useListSessions() {
  return useQuery({ queryKey: getListSessionsQueryKey(), queryFn: () => apiFetch<Session[]>("/api/sessions") });
}
export function useCreateSession() {
  return useMutation({
    mutationFn: (b: { data: { title: string; model?: string; repositoryId?: string } }) =>
      apiFetch<Session>("/api/sessions", { method: "POST", body: JSON.stringify(b.data) }),
  });
}
export const getGetSessionQueryKey = (id: string) => [`/api/sessions/${id}`] as const;
export function useGetSession(id: string | undefined, options?: { query?: Partial<UseQueryOptions> }) {
  return useQuery({
    ...(options?.query as any),
    queryKey: (options?.query as any)?.queryKey ?? getGetSessionQueryKey(id ?? ""),
    queryFn: () => apiFetch<Session>(`/api/sessions/${id}`),
    enabled: (options?.query as any)?.enabled ?? !!id,
  });
}
export const getListMessagesQueryKey = (id: string) => [`/api/sessions/${id}/messages`] as const;
export function useListMessages(id: string | undefined, options?: { query?: Partial<UseQueryOptions> }) {
  return useQuery({
    ...(options?.query as any),
    queryKey: (options?.query as any)?.queryKey ?? getListMessagesQueryKey(id ?? ""),
    queryFn: () => apiFetch<Message[]>(`/api/sessions/${id}/messages`),
    enabled: (options?.query as any)?.enabled ?? !!id,
  });
}
export function useSendMessage() {
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { content: string } }) =>
      apiFetch<Message>(`/api/sessions/${id}/messages`, { method: "POST", body: JSON.stringify(data) }),
  });
}

// ═══════════════════════════════════════════════════════════════════════
// REPOSITORIES
// ═══════════════════════════════════════════════════════════════════════
export const getListRepositoriesQueryKey = () => ["/api/repositories"] as const;
export function useListRepositories() {
  return useQuery({ queryKey: getListRepositoriesQueryKey(), queryFn: () => apiFetch<Repository[]>("/api/repositories") });
}
export function useConnectRepository() {
  return useMutation({
    mutationFn: (b: { data: { url: string; provider: string; name: string } }) =>
      apiFetch<Repository>("/api/repositories", { method: "POST", body: JSON.stringify(b.data) }),
  });
}
export const getGetRepositoryQueryKey = (id: string) => [`/api/repositories/${id}`] as const;
export function useGetRepository(id: string | undefined) {
  return useQuery({
    queryKey: getGetRepositoryQueryKey(id ?? ""),
    queryFn: () => apiFetch<RepositoryDetail>(`/api/repositories/${id}`),
    enabled: !!id,
  });
}
export function useScanRepository() {
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ repositoryId: string; status: string; startedAt: string }>(`/api/repositories/${id}/scan`, { method: "POST" }),
  });
}
export function useGetRepositoryGraph(id: string | undefined) {
  return useQuery({
    queryKey: [`/api/repositories/${id}/graph`],
    queryFn: () => apiFetch<any>(`/api/repositories/${id}/graph`),
    enabled: !!id,
  });
}
export function useAnalyzeRepository() {
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<RepositoryAnalysis>(`/api/repositories/${id}/analyze`, { method: "POST" }),
  });
}

// ═══════════════════════════════════════════════════════════════════════
// AGENTS
// ═══════════════════════════════════════════════════════════════════════
export function useListAgents() {
  return useQuery({ queryKey: ["/api/agents"], queryFn: () => apiFetch<Agent[]>("/api/agents") });
}

// ═══════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════════
export function useGetDashboardStats() {
  return useQuery({ queryKey: ["/api/dashboard/stats"], queryFn: () => apiFetch<DashboardStats>("/api/dashboard/stats") });
}
export function useGetDashboardActivity() {
  return useQuery({ queryKey: ["/api/dashboard/activity"], queryFn: () => apiFetch<ActivityItem[]>("/api/dashboard/activity") });
}
export function useGetAgentMetrics() {
  return useQuery({ queryKey: ["/api/dashboard/agent-metrics"], queryFn: () => apiFetch<AgentMetric[]>("/api/dashboard/agent-metrics") });
}

// ═══════════════════════════════════════════════════════════════════════
// SECURITY
// ═══════════════════════════════════════════════════════════════════════
export function useListSecurityFindings(params?: { repositoryId?: string; severity?: string }) {
  const qs = params ? new URLSearchParams(Object.entries(params).filter(([,v]) => !!v) as any).toString() : "";
  return useQuery({
    queryKey: ["/api/security/findings", params],
    queryFn: () => apiFetch<SecurityFinding[]>(`/api/security/findings${qs ? "?" + qs : ""}`),
  });
}
export function useGetSecuritySummary() {
  return useQuery({ queryKey: ["/api/security/summary"], queryFn: () => apiFetch<SecuritySummary>("/api/security/summary") });
}
export function useResolveSecurityFinding() {
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiFetch(`/api/security/findings/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
  });
}

// ═══════════════════════════════════════════════════════════════════════
// DEPLOYMENTS
// ═══════════════════════════════════════════════════════════════════════
export function useListDeployments() {
  return useQuery({ queryKey: ["/api/deployments"], queryFn: () => apiFetch<Deployment[]>("/api/deployments") });
}

// ═══════════════════════════════════════════════════════════════════════
// EXECUTIONS
// ═══════════════════════════════════════════════════════════════════════
export const getListExecutionsQueryKey = () => ["/api/executions"] as const;
export function useListExecutions() {
  return useQuery({ queryKey: getListExecutionsQueryKey(), queryFn: () => apiFetch<Execution[]>("/api/executions") });
}
export function useCreateExecution() {
  return useMutation({
    mutationFn: (b: { data: { command: string; sessionId?: string } }) =>
      apiFetch<Execution>("/api/executions", { method: "POST", body: JSON.stringify(b.data) }),
  });
}
