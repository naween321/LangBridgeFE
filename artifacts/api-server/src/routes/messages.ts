import { Router } from "express";
import { db } from "@workspace/db";
import { conversationsTable, directMessagesTable, usersTable, lawyerProfilesTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.get("/conversations", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const conversations = await db.select().from(conversationsTable)
      .where(eq(conversationsTable.userId, user.id))
      .orderBy(desc(conversationsTable.lastMessageAt));

    const enriched = await Promise.all(conversations.map(async (conv) => {
      const lawyer = await db.query.lawyerProfilesTable.findFirst({ where: eq(lawyerProfilesTable.id, conv.lawyerId) });
      const lawyerUser = lawyer ? await db.query.usersTable.findFirst({ where: eq(usersTable.id, lawyer.userId) }) : null;
      return {
        ...conv,
        lawyerName: lawyerUser ? `${lawyerUser.firstName} ${lawyerUser.lastName}` : "Lawyer",
        lawyerAvatarUrl: lawyerUser?.avatarUrl,
      };
    }));

    return res.json(enriched);
  } catch (err) {
    req.log.error({ err }, "Get conversations error");
    return res.status(500).json({ error: "Failed" });
  }
});

router.get("/conversations/:conversationId", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const convId = parseInt(req.params.conversationId);
    const conv = await db.query.conversationsTable.findFirst({
      where: and(eq(conversationsTable.id, convId), eq(conversationsTable.userId, user.id)),
    });
    if (!conv) return res.status(404).json({ error: "Conversation not found" });

    const lawyer = await db.query.lawyerProfilesTable.findFirst({ where: eq(lawyerProfilesTable.id, conv.lawyerId) });
    const lawyerUser = lawyer ? await db.query.usersTable.findFirst({ where: eq(usersTable.id, lawyer.userId) }) : null;

    const messages = await db.select().from(directMessagesTable)
      .where(eq(directMessagesTable.conversationId, convId))
      .orderBy(directMessagesTable.createdAt);

    return res.json({
      ...conv,
      lawyerName: lawyerUser ? `${lawyerUser.firstName} ${lawyerUser.lastName}` : "Lawyer",
      lawyerAvatarUrl: lawyerUser?.avatarUrl,
      messages,
    });
  } catch (err) {
    req.log.error({ err }, "Get conversation error");
    return res.status(500).json({ error: "Failed" });
  }
});

router.post("/conversations/:conversationId/send", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const convId = parseInt(req.params.conversationId);
    const { content } = req.body;

    const conv = await db.query.conversationsTable.findFirst({
      where: and(eq(conversationsTable.id, convId), eq(conversationsTable.userId, user.id)),
    });
    if (!conv) return res.status(404).json({ error: "Conversation not found" });

    const [message] = await db.insert(directMessagesTable).values({
      conversationId: convId,
      senderId: user.id,
      content,
    }).returning();

    await db.update(conversationsTable)
      .set({ lastMessage: content, lastMessageAt: new Date() })
      .where(eq(conversationsTable.id, convId));

    return res.status(201).json(message);
  } catch (err) {
    req.log.error({ err }, "Send direct message error");
    return res.status(500).json({ error: "Failed" });
  }
});

router.post("/start", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const { lawyerId, initialMessage } = req.body;

    const existing = await db.query.conversationsTable.findFirst({
      where: and(eq(conversationsTable.userId, user.id), eq(conversationsTable.lawyerId, lawyerId)),
    });

    let conv;
    if (existing) {
      conv = existing;
    } else {
      const [created] = await db.insert(conversationsTable).values({
        userId: user.id,
        lawyerId,
        unreadCount: 0,
      }).returning();
      conv = created;
    }

    if (initialMessage) {
      await db.insert(directMessagesTable).values({
        conversationId: conv.id,
        senderId: user.id,
        content: initialMessage,
      });
      await db.update(conversationsTable)
        .set({ lastMessage: initialMessage, lastMessageAt: new Date() })
        .where(eq(conversationsTable.id, conv.id));
    }

    const lawyer = await db.query.lawyerProfilesTable.findFirst({ where: eq(lawyerProfilesTable.id, lawyerId) });
    const lawyerUser = lawyer ? await db.query.usersTable.findFirst({ where: eq(usersTable.id, lawyer.userId) }) : null;

    return res.status(201).json({
      ...conv,
      lawyerName: lawyerUser ? `${lawyerUser.firstName} ${lawyerUser.lastName}` : "Lawyer",
      lawyerAvatarUrl: lawyerUser?.avatarUrl,
    });
  } catch (err) {
    req.log.error({ err }, "Start conversation error");
    return res.status(500).json({ error: "Failed" });
  }
});

export default router;
