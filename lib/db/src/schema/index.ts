import { ObjectId } from "mongodb";

export { ObjectId };

// ── Users ────────────────────────────────────────────────────────────────────
export interface User {
  _id: ObjectId;
  githubId: number;
  login: string;
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  githubToken?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ── Sessions ─────────────────────────────────────────────────────────────────
export interface Session {
  _id: ObjectId;
  title: string;
  repositoryId?: string | null;
  status: "active" | "idle" | "completed" | "error";
  model: string;
  messageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// ── Messages ─────────────────────────────────────────────────────────────────
export interface Message {
  _id: ObjectId;
  sessionId: string;
  role: "user" | "assistant" | "system" | "agent";
  content: string;
  agentType?: string | null;
  metadata?: Record<string, any> | null;
  createdAt: Date;
}

// ── Repositories ─────────────────────────────────────────────────────────────
export interface Repository {
  _id: ObjectId;
  name: string;
  fullName: string;
  provider: "github" | "gitlab" | "bitbucket" | "azure" | "local";
  url: string;
  language: string;
  status: "connected" | "scanning" | "ready" | "error";
  lastScannedAt?: Date | null;
  fileCount: number;
  lineCount: number;
  frameworks: string[];
  description: string;
  branches: string[];
  dependencies: string[];
  apis: string[];
  databases: string[];
  cicdPlatform?: string | null;
  createdAt: Date;
}

// ── Agents ───────────────────────────────────────────────────────────────────
export interface Agent {
  _id: ObjectId;
  type: "planner" | "repository" | "research" | "coding" | "debug" | "security" | "review" | "deployment";
  status: "idle" | "running" | "waiting" | "complete" | "error";
  currentTask?: string | null;
  tasksCompleted: number;
  sessionId?: string | null;
  lastActiveAt: Date;
}

// ── Deployments ──────────────────────────────────────────────────────────────
export interface Deployment {
  _id: ObjectId;
  repositoryId: string;
  environment: "development" | "staging" | "production";
  platform: "azure" | "aws" | "gcp" | "docker" | "kubernetes";
  status: "pending" | "building" | "deploying" | "success" | "failed" | "rolled_back";
  version: string;
  branch: string;
  commitHash: string;
  deployedBy: string;
  durationMs?: number | null;
  createdAt: Date;
  completedAt?: Date | null;
}

// ── Security Findings ─────────────────────────────────────────────────────────
export interface SecurityFinding {
  _id: ObjectId;
  repositoryId: string;
  title: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  category: "secret_leak" | "prompt_injection" | "malicious_package" | "destructive_command" | "vulnerability" | "dependency";
  file?: string | null;
  line?: number | null;
  status: "open" | "resolved" | "dismissed";
  detectedAt: Date;
}

// ── Activity ─────────────────────────────────────────────────────────────────
export interface Activity {
  _id: ObjectId;
  type: "repo_connected" | "scan_complete" | "agent_task" | "code_generated" | "security_alert" | "deployment" | "pr_created" | "test_run";
  title: string;
  description: string;
  repositoryId?: string | null;
  repositoryName?: string | null;
  agentType?: string | null;
  severity?: string | null;
  createdAt: Date;
}

// ── Executions ───────────────────────────────────────────────────────────────
export interface Execution {
  _id: ObjectId;
  command: string;
  status: "queued" | "running" | "success" | "error" | "blocked";
  output: string;
  exitCode?: number | null;
  sessionId?: string | null;
  durationMs?: number | null;
  createdAt: Date;
}
