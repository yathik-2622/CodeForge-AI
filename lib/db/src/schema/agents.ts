import { pgTable, text, serial, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const agentTypeEnum = pgEnum("agent_type", ["planner", "repository", "research", "coding", "debug", "security", "review", "deployment"]);
export const agentStatusEnum = pgEnum("agent_status", ["idle", "running", "waiting", "complete", "error"]);

export const agentsTable = pgTable("agents", {
  id: serial("id").primaryKey(),
  type: agentTypeEnum("type").notNull(),
  status: agentStatusEnum("status").notNull().default("idle"),
  currentTask: text("current_task"),
  tasksCompleted: integer("tasks_completed").notNull().default(0),
  sessionId: integer("session_id"),
  lastActiveAt: timestamp("last_active_at").notNull().defaultNow(),
});

export const insertAgentSchema = createInsertSchema(agentsTable).omit({ id: true });
export type InsertAgent = z.infer<typeof insertAgentSchema>;
export type Agent = typeof agentsTable.$inferSelect;
