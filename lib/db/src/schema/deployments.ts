import { pgTable, text, serial, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const deploymentEnvEnum = pgEnum("deployment_env", ["development", "staging", "production"]);
export const deploymentPlatformEnum = pgEnum("deployment_platform", ["azure", "aws", "gcp", "docker", "kubernetes"]);
export const deploymentStatusEnum = pgEnum("deployment_status", ["pending", "building", "deploying", "success", "failed", "rolled_back"]);

export const deploymentsTable = pgTable("deployments", {
  id: serial("id").primaryKey(),
  repositoryId: integer("repository_id").notNull(),
  environment: deploymentEnvEnum("environment").notNull(),
  platform: deploymentPlatformEnum("platform").notNull(),
  status: deploymentStatusEnum("status").notNull().default("pending"),
  version: text("version").notNull(),
  branch: text("branch").notNull(),
  commitHash: text("commit_hash").notNull(),
  deployedBy: text("deployed_by").notNull(),
  durationMs: integer("duration_ms"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const insertDeploymentSchema = createInsertSchema(deploymentsTable).omit({ id: true, createdAt: true });
export type InsertDeployment = z.infer<typeof insertDeploymentSchema>;
export type Deployment = typeof deploymentsTable.$inferSelect;
