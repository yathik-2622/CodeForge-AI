import { pgTable, text, serial, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const activityTypeEnum = pgEnum("activity_type", ["repo_connected", "scan_complete", "agent_task", "code_generated", "security_alert", "deployment", "pr_created", "test_run"]);

export const activityTable = pgTable("activity", {
  id: serial("id").primaryKey(),
  type: activityTypeEnum("type").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  repositoryId: integer("repository_id"),
  repositoryName: text("repository_name"),
  agentType: text("agent_type"),
  severity: text("severity"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertActivitySchema = createInsertSchema(activityTable).omit({ id: true, createdAt: true });
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Activity = typeof activityTable.$inferSelect;
