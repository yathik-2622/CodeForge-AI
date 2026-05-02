import { pgTable, text, serial, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const sessionStatusEnum = pgEnum("session_status", ["active", "idle", "completed", "error"]);

export const sessionsTable = pgTable("sessions", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  repositoryId: integer("repository_id"),
  status: sessionStatusEnum("status").notNull().default("idle"),
  model: text("model").notNull().default("gpt-4o"),
  messageCount: integer("message_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertSessionSchema = createInsertSchema(sessionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessionsTable.$inferSelect;
