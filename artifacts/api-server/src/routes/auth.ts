import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, sessionsTable, membershipTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "lexai-salt").digest("hex");
}

function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

async function getUserFromToken(token: string) {
  const session = await db.query.sessionsTable.findFirst({
    where: eq(sessionsTable.token, token),
  });
  if (!session || session.expiresAt < new Date()) return null;
  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, session.userId),
  });
  return user;
}

export { getUserFromToken };

router.post("/register", async (req, res) => {
  try {
    const { email, firstName, lastName, password, role, language } = req.body;
    if (!email || !firstName || !lastName || !password || !role) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const existing = await db.query.usersTable.findFirst({ where: eq(usersTable.email, email) });
    if (existing) return res.status(409).json({ error: "Email already registered" });

    const [user] = await db.insert(usersTable).values({
      email,
      firstName,
      lastName,
      passwordHash: hashPassword(password),
      role: role as "NORMAL" | "LAWYER",
      language: language || "English",
      membershipPlan: "FREE",
    }).returning();

    await db.insert(membershipTable).values({ userId: user.id, plan: "FREE" });

    const token = generateToken();
    await db.insert(sessionsTable).values({
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    const { passwordHash, ...safeUser } = user;
    return res.status(201).json({ user: safeUser, token });
  } catch (err) {
    req.log.error({ err }, "Registration error");
    return res.status(500).json({ error: "Registration failed" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Missing credentials" });

    const user = await db.query.usersTable.findFirst({ where: eq(usersTable.email, email) });
    if (!user || user.passwordHash !== hashPassword(password)) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = generateToken();
    await db.insert(sessionsTable).values({
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    const { passwordHash, ...safeUser } = user;
    return res.json({ user: safeUser, token });
  } catch (err) {
    req.log.error({ err }, "Login error");
    return res.status(500).json({ error: "Login failed" });
  }
});

router.post("/logout", async (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (token) {
      await db.delete(sessionsTable).where(eq(sessionsTable.token, token));
    }
    return res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Logout error");
    return res.status(500).json({ error: "Logout failed" });
  }
});

router.get("/me", async (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) return res.status(401).json({ error: "Not authenticated" });
    const user = await getUserFromToken(token);
    if (!user) return res.status(401).json({ error: "Session expired" });
    const { passwordHash, ...safeUser } = user;
    return res.json(safeUser);
  } catch (err) {
    req.log.error({ err }, "Get me error");
    return res.status(500).json({ error: "Failed to get user" });
  }
});

export default router;
