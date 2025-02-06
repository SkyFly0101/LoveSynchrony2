import { pgTable, text, serial, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const couples = pgTable("couples", {
  id: serial("id").primaryKey(),
  anniversary: date("anniversary").notNull(),
  partner1Name: text("partner1_name").notNull(),
  partner2Name: text("partner2_name").notNull(),
});

export const moods = pgTable("moods", {
  id: serial("id").primaryKey(),
  coupleId: serial("couple_id").references(() => couples.id),
  partner1Mood: text("partner1_mood").notNull(),
  partner2Mood: text("partner2_mood").notNull(),
  date: timestamp("date").notNull().defaultNow(),
});

export const insertCoupleSchema = createInsertSchema(couples).pick({
  anniversary: true,
  partner1Name: true,
  partner2Name: true,
});

// Modified to allow partial updates for single partner
export const insertMoodSchema = z.object({
  coupleId: z.number(),
  partner1Mood: z.string().optional(),
  partner2Mood: z.string().optional(),
}).refine(data => data.partner1Mood !== undefined || data.partner2Mood !== undefined, {
  message: "At least one partner's mood must be provided"
});

export type InsertCouple = z.infer<typeof insertCoupleSchema>;
export type InsertMood = z.infer<typeof insertMoodSchema>;
export type Couple = typeof couples.$inferSelect;
export type Mood = typeof moods.$inferSelect;