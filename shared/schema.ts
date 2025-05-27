import { pgTable, text, serial, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const repositories = pgTable("repositories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  path: text("path").notNull().unique(),
  lastAccessed: timestamp("last_accessed").defaultNow(),
});

export const comparisons = pgTable("comparisons", {
  id: serial("id").primaryKey(),
  repositoryId: integer("repository_id").references(() => repositories.id),
  sourceBranch: text("source_branch").notNull(),
  targetBranch: text("target_branch").notNull(),
  changedFiles: jsonb("changed_files"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertRepositorySchema = createInsertSchema(repositories).omit({
  id: true,
  lastAccessed: true,
});

export const insertComparisonSchema = createInsertSchema(comparisons).omit({
  id: true,
  createdAt: true,
});

export type Repository = typeof repositories.$inferSelect;
export type InsertRepository = z.infer<typeof insertRepositorySchema>;
export type Comparison = typeof comparisons.$inferSelect;
export type InsertComparison = z.infer<typeof insertComparisonSchema>;
