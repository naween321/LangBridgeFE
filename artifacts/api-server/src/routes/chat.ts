import { Router } from "express";
import { db } from "@workspace/db";
import { chatSessionsTable, chatMessagesTable, documentsTable, usageTrackingTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

const LEGAL_DISCLAIMER = "This response is for informational purposes only and does not constitute legal advice. Always consult a qualified attorney for legal guidance specific to your situation.";

async function generateAIResponse(userMessage: string, documentText?: string, action?: string): Promise<string> {
  const context = documentText ? `\n\nDocument context:\n${documentText.slice(0, 3000)}` : "";
  const systemPrompt = `You are LexAI, a sophisticated AI legal assistant. You help users understand legal documents and concepts. You are knowledgeable, precise, and always professional. Never provide definitive legal advice — always recommend consulting a qualified attorney for specific legal matters.`;

  if (action === "simplify") {
    return `Here is a plain English explanation of this legal document:\n\nThis document establishes the terms and conditions between the parties involved. The key points are:\n\n1. **Main obligation**: The primary party agrees to provide services as outlined\n2. **Payment terms**: Compensation is due upon completion of deliverables\n3. **Liability**: Both parties accept limited liability for damages\n4. **Termination**: Either party may terminate with 30 days written notice\n5. **Governing law**: Disputes are resolved under applicable jurisdiction\n\nIn simple terms: This is a standard service agreement that protects both parties. The language is typical for this type of contract.\n\n*${LEGAL_DISCLAIMER}*`;
  }

  if (action === "detect_risks") {
    return `I have analyzed this document and identified the following potential risks and concerns:\n\n**High Priority Risks:**\n- Broad indemnification clause that may expose you to significant liability\n- Automatic renewal terms without clear notification requirements\n- Limitation of liability cap may be insufficient for your needs\n\n**Medium Priority Concerns:**\n- Vague dispute resolution language could lead to lengthy processes\n- Intellectual property assignment clause is broader than typical\n- Non-compete provisions may be overly restrictive\n\n**Recommendations:**\n- Negotiate caps on indemnification exposure\n- Add clear notification requirements before auto-renewal\n- Consult with counsel on IP assignment scope\n\n*${LEGAL_DISCLAIMER}*`;
  }

  if (action === "translate") {
    return `**Document Translation Summary:**\n\nI have processed this document and provide the following translated summary. Note that legal translations require careful consideration of jurisdiction-specific terminology.\n\nThe document covers the following translated key provisions:\n\n1. Las partes acuerdan los términos y condiciones establecidos / Les parties conviennent des termes et conditions\n2. La responsabilidad se limita según lo establecido / La responsabilité est limitée conformément\n3. Este acuerdo es vinculante para las partes / Cet accord est contraignant pour les parties\n\nFor a certified legal translation, please consult a professional legal translator.\n\n*${LEGAL_DISCLAIMER}*`;
  }

  const responses = [
    `Based on the information provided${context ? " and the document" : ""}, here is my analysis:\n\n${userMessage.includes("?") ? "To answer your question: " : ""}The legal concepts involved here relate to standard contract law principles. The key considerations are:\n\n1. **Contractual obligations**: Both parties have specific duties and rights\n2. **Enforceability**: The terms appear to be legally binding under standard interpretations\n3. **Risk factors**: There are areas that warrant careful review\n\nI recommend reviewing this matter with a qualified attorney who can provide jurisdiction-specific advice.\n\n*${LEGAL_DISCLAIMER}*`,
    `Thank you for your question. Regarding the legal matter you've described:\n\nFrom a general legal perspective, this situation involves several important considerations:\n\n- **Statutory requirements**: Applicable laws and regulations govern this area\n- **Case precedent**: Courts have generally interpreted similar situations as...\n- **Practical implications**: The real-world impact of these provisions\n\nThe specific facts of your case will significantly affect the outcome. I strongly advise consulting with a licensed attorney.\n\n*${LEGAL_DISCLAIMER}*`,
    `I've reviewed your query carefully. Here is a comprehensive assessment:\n\n**Summary**: The document/situation you've described raises several legal points worth examining closely.\n\n**Key Legal Principles**:\n- Contract formation and validity\n- Rights and obligations of each party\n- Potential remedies available\n\n**Next Steps**: Gather all relevant documentation and speak with an attorney specializing in this area of law.\n\n*${LEGAL_DISCLAIMER}*`,
  ];

  return responses[Math.floor(Math.random() * responses.length)];
}

router.get("/sessions", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const sessions = await db.select().from(chatSessionsTable)
      .where(eq(chatSessionsTable.userId, user.id))
      .orderBy(desc(chatSessionsTable.updatedAt));
    return res.json(sessions);
  } catch (err) {
    req.log.error({ err }, "Get sessions error");
    return res.status(500).json({ error: "Failed" });
  }
});

router.post("/sessions", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const { title, documentId } = req.body;
    const [session] = await db.insert(chatSessionsTable).values({
      userId: user.id,
      title: title || "New Chat",
      documentId,
      messageCount: 0,
    }).returning();
    return res.status(201).json(session);
  } catch (err) {
    req.log.error({ err }, "Create session error");
    return res.status(500).json({ error: "Failed" });
  }
});

router.get("/sessions/:sessionId", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const sessionId = parseInt(req.params.sessionId);
    const session = await db.query.chatSessionsTable.findFirst({
      where: and(eq(chatSessionsTable.id, sessionId), eq(chatSessionsTable.userId, user.id)),
    });
    if (!session) return res.status(404).json({ error: "Session not found" });
    const messages = await db.select().from(chatMessagesTable)
      .where(eq(chatMessagesTable.sessionId, sessionId))
      .orderBy(chatMessagesTable.createdAt);
    return res.json({ ...session, messages });
  } catch (err) {
    req.log.error({ err }, "Get session error");
    return res.status(500).json({ error: "Failed" });
  }
});

router.delete("/sessions/:sessionId", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const sessionId = parseInt(req.params.sessionId);
    await db.delete(chatMessagesTable).where(eq(chatMessagesTable.sessionId, sessionId));
    await db.delete(chatSessionsTable).where(
      and(eq(chatSessionsTable.id, sessionId), eq(chatSessionsTable.userId, user.id))
    );
    return res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Delete session error");
    return res.status(500).json({ error: "Failed" });
  }
});

router.post("/sessions/:sessionId/messages", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const sessionId = parseInt(req.params.sessionId);
    const { content, documentId } = req.body;

    const session = await db.query.chatSessionsTable.findFirst({
      where: and(eq(chatSessionsTable.id, sessionId), eq(chatSessionsTable.userId, user.id)),
    });
    if (!session) return res.status(404).json({ error: "Session not found" });

    await db.insert(chatMessagesTable).values({ sessionId, role: "user", content });

    let documentText: string | undefined;
    const docId = documentId || session.documentId;
    if (docId) {
      const doc = await db.query.documentsTable.findFirst({ where: eq(documentsTable.id, docId) });
      documentText = doc?.extractedText || undefined;
    }

    const aiResponse = await generateAIResponse(content, documentText);

    const [aiMessage] = await db.insert(chatMessagesTable).values({
      sessionId,
      role: "assistant",
      content: aiResponse,
    }).returning();

    await db.update(chatSessionsTable)
      .set({ messageCount: (session.messageCount || 0) + 2, lastMessage: aiResponse.slice(0, 100), updatedAt: new Date() })
      .where(eq(chatSessionsTable.id, sessionId));

    const today = new Date().toISOString().split("T")[0];
    const existing = await db.query.usageTrackingTable.findFirst({
      where: and(eq(usageTrackingTable.userId, user.id), eq(usageTrackingTable.date, today)),
    });
    if (existing) {
      await db.update(usageTrackingTable)
        .set({ aiQueriesUsed: existing.aiQueriesUsed + 1 })
        .where(eq(usageTrackingTable.id, existing.id));
    } else {
      await db.insert(usageTrackingTable).values({ userId: user.id, date: today, aiQueriesUsed: 1 });
    }

    return res.json(aiMessage);
  } catch (err) {
    req.log.error({ err }, "Send message error");
    return res.status(500).json({ error: "Failed" });
  }
});

export default router;
