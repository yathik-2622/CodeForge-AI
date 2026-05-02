import { pgTable, text, serial, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const securitySeverityEnum = pgEnum("security_severity", ["critical", "high", "medium", "low", "info"]);
export const securityCategoryEnum = pgEnum("security_category", ["secret_leak", "prompt_injection", "malicious_package", "destructive_command", "vulnerability", "dependency"]);
export const securityStatusEnum = pgEnum("security_status", ["open", "resolved", "dismissed"]);

export const securityFindingsTable = pgTable("security_findings", {
  id: serial("id").primaryKey(),
  repositoryId: integer("repository_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  severity: securitySeverityEnum("severity").notNull(),
  category: securityCategoryEnum("category").notNull(),
  file: text("file"),
  line: integer("line"),
  status: securityStatusEnum("status").notNull().default("open"),
  detectedAt: timestamp("detected_at").notNull().defaultNow(),
});

export const insertSecurityFindingSchema = createInsertSchema(securityFindingsTable).omit({ id: true, detectedAt: true });
export type InsertSecurityFinding = z.infer<typeof insertSecurityFindingSchema>;
export type SecurityFinding = typeof securityFindingsTable.$inferSelect;
