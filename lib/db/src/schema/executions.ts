import { pgTable, text, serial, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const executionStatusEnum = pgEnum("execution_status", ["queued", "running", "success", "error", "blocked"]);

export const executionsTable = pgTable("executions", {
  id: serial("id").primaryKey(),
  command: text("command").notNull(),
  status: executionStatusEnum("status").notNull().default("queued"),
  output: text("output").notNull().default(""),
  exitCode: integer("exit_code"),
  sessionId: integer("session_id"),
  durationMs: integer("duration_ms"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertExecutionSchema = createInsertSchema(executionsTable).omit({ id: true, createdAt: true });
export type InsertExecution = z.infer<typeof insertExecutionSchema>;
export type Execution = typeof executionsTable.$inferSelect;
