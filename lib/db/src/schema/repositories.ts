import { pgTable, text, serial, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const providerEnum = pgEnum("provider", ["github", "gitlab", "bitbucket", "azure", "local"]);
export const repoStatusEnum = pgEnum("repo_status", ["connected", "scanning", "ready", "error"]);

export const repositoriesTable = pgTable("repositories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  fullName: text("full_name").notNull(),
  provider: providerEnum("provider").notNull(),
  url: text("url").notNull(),
  language: text("language").notNull().default(""),
  status: repoStatusEnum("status").notNull().default("connected"),
  lastScannedAt: timestamp("last_scanned_at"),
  fileCount: integer("file_count").notNull().default(0),
  lineCount: integer("line_count").notNull().default(0),
  frameworks: text("frameworks").array().notNull().default([]),
  description: text("description").notNull().default(""),
  branches: text("branches").array().notNull().default([]),
  dependencies: text("dependencies").array().notNull().default([]),
  apis: text("apis").array().notNull().default([]),
  databases: text("databases").array().notNull().default([]),
  cicdPlatform: text("cicd_platform"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertRepositorySchema = createInsertSchema(repositoriesTable).omit({ id: true, createdAt: true });
export type InsertRepository = z.infer<typeof insertRepositorySchema>;
export type Repository = typeof repositoriesTable.$inferSelect;
