import { type Couple, type InsertCouple, type Mood, type InsertMood, couples, moods } from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte } from "drizzle-orm";

export interface IStorage {
  getCouple(id: number): Promise<Couple | undefined>;
  createCouple(couple: InsertCouple): Promise<Couple>;
  getMood(coupleId: number, date: Date): Promise<Mood | undefined>;
  setMood(mood: InsertMood): Promise<Mood>;
}

export class DatabaseStorage implements IStorage {
  async getCouple(id: number): Promise<Couple | undefined> {
    const [couple] = await db.select().from(couples).where(eq(couples.id, id));
    return couple;
  }

  async createCouple(insertCouple: InsertCouple): Promise<Couple> {
    const [couple] = await db.insert(couples).values(insertCouple).returning();
    return couple;
  }

  async getMood(coupleId: number, date: Date): Promise<Mood | undefined> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const [mood] = await db
      .select()
      .from(moods)
      .where(
        and(
          eq(moods.coupleId, coupleId),
          and(
            gte(moods.date, startOfDay),
            lte(moods.date, endOfDay)
          )
        )
      );

    return mood;
  }

  async setMood(insertMood: InsertMood): Promise<Mood> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // Get the current day's mood if it exists
    const [existingMood] = await db
      .select()
      .from(moods)
      .where(
        and(
          eq(moods.coupleId, insertMood.coupleId),
          and(
            gte(moods.date, startOfDay),
            lte(moods.date, endOfDay)
          )
        )
      );

    if (existingMood) {
      // Update existing mood entry
      const updateData: Partial<typeof moods.$inferInsert> = {
        date: new Date()
      };

      // Only update the mood for the partner that was specified
      if (insertMood.partner1Mood !== undefined) {
        updateData.partner1Mood = insertMood.partner1Mood;
      }
      if (insertMood.partner2Mood !== undefined) {
        updateData.partner2Mood = insertMood.partner2Mood;
      }

      const [updatedMood] = await db
        .update(moods)
        .set(updateData)
        .where(eq(moods.id, existingMood.id))
        .returning();
      return updatedMood;
    } else {
      // Create new mood entry
      const [newMood] = await db
        .insert(moods)
        .values({
          coupleId: insertMood.coupleId,
          partner1Mood: insertMood.partner1Mood ?? 'none',
          partner2Mood: insertMood.partner2Mood ?? 'none',
          date: new Date()
        })
        .returning();
      return newMood;
    }
  }
}

export const storage = new DatabaseStorage();