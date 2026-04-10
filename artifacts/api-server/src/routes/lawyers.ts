import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, lawyerProfilesTable, reviewsTable, bookingsTable, conversationsTable, directMessagesTable } from "@workspace/db";
import { eq, and, gte, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

async function buildLawyerCard(lawyer: any, user: any) {
  return {
    id: lawyer.id,
    userId: lawyer.userId,
    firstName: user.firstName,
    lastName: user.lastName,
    avatarUrl: user.avatarUrl,
    specialization: lawyer.specialization,
    languages: JSON.parse(lawyer.languages || "[]"),
    yearsOfExperience: lawyer.yearsOfExperience,
    rating: (lawyer.rating || 0) / 10,
    reviewCount: lawyer.reviewCount || 0,
    hourlyRate: lawyer.hourlyRate,
    verificationStatus: lawyer.verificationStatus,
  };
}

router.get("/stats", requireAuth, async (req, res) => {
  try {
    const allLawyers = await db.select({
      lawyer: lawyerProfilesTable,
      user: usersTable,
    }).from(lawyerProfilesTable)
      .leftJoin(usersTable, eq(lawyerProfilesTable.userId, usersTable.id))
      .where(eq(lawyerProfilesTable.verificationStatus, "APPROVED"));

    const bySpec: Record<string, number> = {};
    let totalRating = 0;
    for (const { lawyer } of allLawyers) {
      bySpec[lawyer.specialization] = (bySpec[lawyer.specialization] || 0) + 1;
      totalRating += (lawyer.rating || 0) / 10;
    }
    const cards = await Promise.all(allLawyers.slice(0, 5).map(({ lawyer, user }) => buildLawyerCard(lawyer, user)));

    return res.json({
      totalLawyers: allLawyers.length,
      bySpecialization: Object.entries(bySpec).map(([specialization, count]) => ({ specialization, count })),
      topRatedLawyers: cards,
      averageRating: allLawyers.length ? totalRating / allLawyers.length : 0,
    });
  } catch (err) {
    req.log.error({ err }, "Get lawyer stats error");
    return res.status(500).json({ error: "Failed" });
  }
});

router.get("/", requireAuth, async (req, res) => {
  try {
    const { specialization, language, search, minRating } = req.query;
    let query = db.select({
      lawyer: lawyerProfilesTable,
      user: usersTable,
    }).from(lawyerProfilesTable)
      .leftJoin(usersTable, eq(lawyerProfilesTable.userId, usersTable.id));

    const results = await query;
    let filtered = results;

    if (specialization) {
      filtered = filtered.filter(r => r.lawyer.specialization.toLowerCase().includes((specialization as string).toLowerCase()));
    }
    if (language) {
      filtered = filtered.filter(r => {
        const langs = JSON.parse(r.lawyer.languages || "[]") as string[];
        return langs.some(l => l.toLowerCase().includes((language as string).toLowerCase()));
      });
    }
    if (search) {
      const s = (search as string).toLowerCase();
      filtered = filtered.filter(r =>
        r.user?.firstName?.toLowerCase().includes(s) ||
        r.user?.lastName?.toLowerCase().includes(s) ||
        r.lawyer.specialization.toLowerCase().includes(s)
      );
    }
    if (minRating) {
      filtered = filtered.filter(r => (r.lawyer.rating || 0) / 10 >= parseFloat(minRating as string));
    }

    const cards = await Promise.all(filtered.map(({ lawyer, user }) => buildLawyerCard(lawyer, user!)));
    return res.json(cards);
  } catch (err) {
    req.log.error({ err }, "Get lawyers error");
    return res.status(500).json({ error: "Failed" });
  }
});

router.get("/:lawyerId/availability", requireAuth, async (req, res) => {
  try {
    const slots = [];
    const base = new Date();
    base.setHours(9, 0, 0, 0);
    for (let h = 9; h <= 16; h++) {
      const start = new Date(base);
      start.setHours(h);
      const end = new Date(start);
      end.setHours(h + 1);
      slots.push({
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        available: Math.random() > 0.3,
      });
    }
    return res.json(slots);
  } catch (err) {
    req.log.error({ err }, "Get availability error");
    return res.status(500).json({ error: "Failed" });
  }
});

router.get("/:lawyerId", requireAuth, async (req, res) => {
  try {
    const lawyerId = parseInt(req.params.lawyerId);
    const lawyer = await db.query.lawyerProfilesTable.findFirst({ where: eq(lawyerProfilesTable.id, lawyerId) });
    if (!lawyer) return res.status(404).json({ error: "Lawyer not found" });
    const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, lawyer.userId) });
    if (!user) return res.status(404).json({ error: "User not found" });
    return res.json({
      id: lawyer.id,
      userId: lawyer.userId,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      specialization: lawyer.specialization,
      languages: JSON.parse(lawyer.languages || "[]"),
      yearsOfExperience: lawyer.yearsOfExperience,
      rating: (lawyer.rating || 0) / 10,
      reviewCount: lawyer.reviewCount || 0,
      hourlyRate: lawyer.hourlyRate,
      bio: lawyer.bio || user.bio,
      barNumber: lawyer.barNumber,
      verificationStatus: lawyer.verificationStatus,
      availability: ["Monday 9-17", "Tuesday 9-17", "Thursday 9-17", "Friday 9-15"],
    });
  } catch (err) {
    req.log.error({ err }, "Get lawyer error");
    return res.status(500).json({ error: "Failed" });
  }
});

router.get("/:lawyerId/reviews", requireAuth, async (req, res) => {
  try {
    const lawyerId = parseInt(req.params.lawyerId);
    const reviews = await db.select({
      review: reviewsTable,
      user: usersTable,
    }).from(reviewsTable)
      .leftJoin(usersTable, eq(reviewsTable.userId, usersTable.id))
      .where(eq(reviewsTable.lawyerId, lawyerId))
      .orderBy(desc(reviewsTable.createdAt));

    return res.json(reviews.map(({ review, user }) => ({
      id: review.id,
      lawyerId: review.lawyerId,
      userId: review.userId,
      userName: user ? `${user.firstName} ${user.lastName}` : "Anonymous",
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt,
    })));
  } catch (err) {
    req.log.error({ err }, "Get reviews error");
    return res.status(500).json({ error: "Failed" });
  }
});

router.post("/:lawyerId/reviews", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const lawyerId = parseInt(req.params.lawyerId);
    const { rating, comment } = req.body;

    const [review] = await db.insert(reviewsTable).values({
      lawyerId,
      userId: user.id,
      rating,
      comment,
    }).returning();

    const lawyer = await db.query.lawyerProfilesTable.findFirst({ where: eq(lawyerProfilesTable.id, lawyerId) });
    if (lawyer) {
      const newCount = (lawyer.reviewCount || 0) + 1;
      const newRating = Math.round(((lawyer.rating || 0) + rating * 10) / 2);
      await db.update(lawyerProfilesTable)
        .set({ reviewCount: newCount, rating: newRating })
        .where(eq(lawyerProfilesTable.id, lawyerId));
    }

    return res.status(201).json({
      id: review.id,
      lawyerId: review.lawyerId,
      userId: review.userId,
      userName: `${user.firstName} ${user.lastName}`,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt,
    });
  } catch (err) {
    req.log.error({ err }, "Add review error");
    return res.status(500).json({ error: "Failed" });
  }
});

export default router;
