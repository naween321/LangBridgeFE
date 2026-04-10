import { Router } from "express";
import { db } from "@workspace/db";
import { membershipTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

const FREE_FEATURES = ["2 document uploads/day", "10 AI queries/day", "Access to LawyerNet", "Basic chat support"];
const PREMIUM_FEATURES = ["Unlimited document uploads", "Unlimited AI queries", "Priority AI responses", "Advanced document analysis", "Document translation", "Full LawyerNet access", "Priority lawyer matching"];

router.get("/", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const membership = await db.query.membershipTable.findFirst({ where: eq(membershipTable.userId, user.id) });
    const isPremium = user.membershipPlan === "PREMIUM";
    return res.json({
      plan: user.membershipPlan,
      startedAt: membership?.startedAt,
      expiresAt: membership?.expiresAt,
      documentsLimit: isPremium ? 999 : 2,
      aiQueriesLimit: isPremium ? 999 : 10,
      features: isPremium ? PREMIUM_FEATURES : FREE_FEATURES,
    });
  } catch (err) {
    req.log.error({ err }, "Get membership error");
    return res.status(500).json({ error: "Failed" });
  }
});

router.post("/upgrade", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await db.update(usersTable).set({ membershipPlan: "PREMIUM", updatedAt: new Date() }).where(eq(usersTable.id, user.id));

    const existing = await db.query.membershipTable.findFirst({ where: eq(membershipTable.userId, user.id) });
    if (existing) {
      await db.update(membershipTable).set({ plan: "PREMIUM", startedAt: new Date(), expiresAt }).where(eq(membershipTable.userId, user.id));
    } else {
      await db.insert(membershipTable).values({ userId: user.id, plan: "PREMIUM", startedAt: new Date(), expiresAt });
    }

    return res.json({
      plan: "PREMIUM",
      startedAt: new Date(),
      expiresAt,
      documentsLimit: 999,
      aiQueriesLimit: 999,
      features: PREMIUM_FEATURES,
    });
  } catch (err) {
    req.log.error({ err }, "Upgrade membership error");
    return res.status(500).json({ error: "Failed" });
  }
});

router.post("/cancel", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    await db.update(usersTable).set({ membershipPlan: "FREE", updatedAt: new Date() }).where(eq(usersTable.id, user.id));
    await db.update(membershipTable).set({ plan: "FREE", active: false }).where(eq(membershipTable.userId, user.id));
    return res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Cancel membership error");
    return res.status(500).json({ error: "Failed" });
  }
});

export default router;
