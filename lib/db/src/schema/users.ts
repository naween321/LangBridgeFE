import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["NORMAL", "LAWYER"] }).notNull().default("NORMAL"),
  avatarUrl: text("avatar_url"),
  language: text("language").default("English"),
  membershipPlan: text("membership_plan", { enum: ["FREE", "PREMIUM"] }).notNull().default("FREE"),
  bio: text("bio"),
  phone: text("phone"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;

export const lawyerProfilesTable = pgTable("lawyer_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  barNumber: text("bar_number").notNull(),
  yearsOfExperience: integer("years_of_experience").notNull(),
  languages: text("languages").notNull(),
  specialization: text("specialization").notNull(),
  age: integer("age").notNull(),
  verificationStatus: text("verification_status", { enum: ["PENDING", "APPROVED", "REJECTED"] }).notNull().default("PENDING"),
  bio: text("bio"),
  hourlyRate: integer("hourly_rate"),
  rating: integer("rating").default(0),
  reviewCount: integer("review_count").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertLawyerProfileSchema = createInsertSchema(lawyerProfilesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertLawyerProfile = z.infer<typeof insertLawyerProfileSchema>;
export type LawyerProfile = typeof lawyerProfilesTable.$inferSelect;

export const usageTrackingTable = pgTable("usage_tracking", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  date: text("date").notNull(),
  documentsUploaded: integer("documents_uploaded").notNull().default(0),
  aiQueriesUsed: integer("ai_queries_used").notNull().default(0),
});

export type UsageTracking = typeof usageTrackingTable.$inferSelect;

export const sessionsTable = pgTable("sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Session = typeof sessionsTable.$inferSelect;

export const membershipTable = pgTable("memberships", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id).unique(),
  plan: text("plan", { enum: ["FREE", "PREMIUM"] }).notNull().default("FREE"),
  startedAt: timestamp("started_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
  active: boolean("active").notNull().default(true),
});

export type Membership = typeof membershipTable.$inferSelect;
