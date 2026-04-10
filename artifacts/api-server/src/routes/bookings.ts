import { Router } from "express";
import { db } from "@workspace/db";
import { bookingsTable, usersTable, lawyerProfilesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import crypto from "crypto";

const router = Router();

function generateMeetLink(): string {
  const code = crypto.randomBytes(5).toString("hex");
  return `https://meet.google.com/${code.slice(0,3)}-${code.slice(3,7)}-${code.slice(7,10)}`;
}

async function enrichBooking(booking: any) {
  const lawyer = await db.query.lawyerProfilesTable.findFirst({ where: eq(lawyerProfilesTable.id, booking.lawyerId) });
  const lawyerUser = lawyer ? await db.query.usersTable.findFirst({ where: eq(usersTable.id, lawyer.userId) }) : null;
  return {
    ...booking,
    lawyerName: lawyerUser ? `${lawyerUser.firstName} ${lawyerUser.lastName}` : "Lawyer",
    lawyerAvatarUrl: lawyerUser?.avatarUrl,
  };
}

router.get("/", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const bookings = await db.select().from(bookingsTable).where(eq(bookingsTable.userId, user.id));
    const enriched = await Promise.all(bookings.map(enrichBooking));
    return res.json(enriched);
  } catch (err) {
    req.log.error({ err }, "Get bookings error");
    return res.status(500).json({ error: "Failed" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const { lawyerId, scheduledAt, duration, notes } = req.body;
    const meetLink = generateMeetLink();
    const [booking] = await db.insert(bookingsTable).values({
      userId: user.id,
      lawyerId,
      scheduledAt: new Date(scheduledAt),
      duration,
      notes,
      meetLink,
      status: "CONFIRMED",
    }).returning();
    const enriched = await enrichBooking(booking);
    return res.status(201).json(enriched);
  } catch (err) {
    req.log.error({ err }, "Create booking error");
    return res.status(500).json({ error: "Failed" });
  }
});

router.get("/:bookingId", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const booking = await db.query.bookingsTable.findFirst({
      where: and(eq(bookingsTable.id, parseInt(req.params.bookingId)), eq(bookingsTable.userId, user.id)),
    });
    if (!booking) return res.status(404).json({ error: "Booking not found" });
    const enriched = await enrichBooking(booking);
    return res.json(enriched);
  } catch (err) {
    req.log.error({ err }, "Get booking error");
    return res.status(500).json({ error: "Failed" });
  }
});

router.delete("/:bookingId", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    await db.update(bookingsTable)
      .set({ status: "CANCELLED" })
      .where(and(eq(bookingsTable.id, parseInt(req.params.bookingId)), eq(bookingsTable.userId, user.id)));
    return res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Cancel booking error");
    return res.status(500).json({ error: "Failed" });
  }
});

export default router;
