import { z } from "zod";

// Sessions
export const CreateSessionBody = z.object({
  title: z.string().min(1),
  repositoryId: z.string().nullable().optional(),
  model: z.string().optional(),
});
export const GetSessionParams    = z.object({ id: z.string() });
export const SendMessageParams   = z.object({ id: z.string() });
export const SendMessageBody     = z.object({ content: z.string().min(1) });

// Repositories
export const ConnectRepositoryBody = z.object({
  url:      z.string().url(),
  provider: z.enum(["github", "gitlab", "bitbucket", "azure", "local"]),
  name:     z.string().min(1),
});
export const GetRepositoryParams      = z.object({ id: z.string() });
export const ScanRepositoryParams     = z.object({ id: z.string() });
export const GetRepositoryGraphParams = z.object({ id: z.string() });
export const AnalyzeRepositoryParams  = z.object({ id: z.string() });

// Security
export const ListSecurityFindingsQueryParams = z.object({
  repositoryId: z.string().optional(),
  severity: z.enum(["critical", "high", "medium", "low", "info"]).optional(),
}).passthrough();

// Deployments
export const GetDeploymentParams = z.object({ id: z.string() });

// Executions
export const CreateExecutionBody = z.object({
  command:   z.string().min(1),
  sessionId: z.string().optional(),
});
export const GetExecutionParams = z.object({ id: z.string() });
