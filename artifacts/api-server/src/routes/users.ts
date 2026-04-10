import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, lawyerProfilesTable, usageTrackingTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.get("/profile", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const { passwordHash, ...safeUser } = user;
    return res.json(safeUser);
  } catch (err) {
    req.log.error({ err }, "Get profile error");
    return res.status(500).json({ error: "Failed" });
  }
});

router.patch("/profile", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const { firstName, lastName, language, bio, phone, avatarUrl } = req.body;
    const [updated] = await db.update(usersTable)
      .set({ firstName, lastName, language, bio, phone, avatarUrl, updatedAt: new Date() })
      .where(eq(usersTable.id, user.id))
      .returning();
    const { passwordHash, ...safeUser } = updated;
    return res.json(safeUser);
  } catch (err) {
    req.log.error({ err }, "Update profile error");
    return res.status(500).json({ error: "Failed" });
  }
});

router.post("/lawyer-profile", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const { barNumber, yearsOfExperience, languages, specialization, age, bio, hourlyRate } = req.body;
    const existing = await db.query.lawyerProfilesTable.findFirst({
      where: eq(lawyerProfilesTable.userId, user.id),
    });
    let profile;
    if (existing) {
      const [updated] = await db.update(lawyerProfilesTable)
        .set({ barNumber, yearsOfExperience, languages: JSON.stringify(languages), specialization, age, bio, hourlyRate, updatedAt: new Date() })
        .where(eq(lawyerProfilesTable.userId, user.id))
        .returning();
      profile = updated;
    } else {
      const [created] = await db.insert(lawyerProfilesTable).values({
        userId: user.id,
        barNumber,
        yearsOfExperience,
        languages: JSON.stringify(languages),
        specialization,
        age,
        bio,
        hourlyRate,
        verificationStatus: "PENDING",
      }).returning();
      profile = created;
    }
    return res.status(201).json({ ...profile, languages: JSON.parse(profile.languages) });
  } catch (err) {
    req.log.error({ err }, "Create lawyer profile error");
    return res.status(500).json({ error: "Failed" });
  }
});

router.get("/usage", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const today = new Date().toISOString().split("T")[0];
    const usage = await db.query.usageTrackingTable.findFirst({
      where: and(eq(usageTrackingTable.userId, user.id), eq(usageTrackingTable.date, today)),
    });
    const isPremium = user.membershipPlan === "PREMIUM";
    return res.json({
      documentsUploadedToday: usage?.documentsUploaded || 0,
      aiQueriesUsedToday: usage?.aiQueriesUsed || 0,
      documentsLimit: isPremium ? 999 : 2,
      aiQueriesLimit: isPremium ? 999 : 10,
      membershipPlan: user.membershipPlan,
    });
  } catch (err) {
    req.log.error({ err }, "Get usage error");
    return res.status(500).json({ error: "Failed" });
  }
});

export default router;
