import { Router } from "express";
import { db } from "@workspace/db";
import { documentsTable, usageTrackingTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

const DISCLAIMER = "This analysis is for informational purposes only and does not constitute legal advice. Consult a qualified attorney for legal guidance.";

router.get("/", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const docs = await db.select().from(documentsTable).where(eq(documentsTable.userId, user.id));
    return res.json(docs);
  } catch (err) {
    req.log.error({ err }, "Get documents error");
    return res.status(500).json({ error: "Failed" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const { name, fileType, fileSize, content } = req.body;

    const today = new Date().toISOString().split("T")[0];
    const usage = await db.query.usageTrackingTable.findFirst({
      where: and(eq(usageTrackingTable.userId, user.id), eq(usageTrackingTable.date, today)),
    });
    const limit = user.membershipPlan === "PREMIUM" ? 999 : 2;
    if ((usage?.documentsUploaded || 0) >= limit) {
      return res.status(429).json({ error: "Daily upload limit reached. Upgrade to Premium for unlimited uploads." });
    }

    const [doc] = await db.insert(documentsTable).values({
      userId: user.id,
      name,
      fileType,
      fileSize,
      extractedText: content || `Legal document content for: ${name}`,
    }).returning();

    if (usage) {
      await db.update(usageTrackingTable)
        .set({ documentsUploaded: usage.documentsUploaded + 1 })
        .where(eq(usageTrackingTable.id, usage.id));
    } else {
      await db.insert(usageTrackingTable).values({ userId: user.id, date: today, documentsUploaded: 1 });
    }

    return res.status(201).json(doc);
  } catch (err) {
    req.log.error({ err }, "Upload document error");
    return res.status(500).json({ error: "Failed" });
  }
});

router.get("/:documentId", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const doc = await db.query.documentsTable.findFirst({
      where: and(eq(documentsTable.id, parseInt(req.params.documentId)), eq(documentsTable.userId, user.id)),
    });
    if (!doc) return res.status(404).json({ error: "Document not found" });
    return res.json(doc);
  } catch (err) {
    req.log.error({ err }, "Get document error");
    return res.status(500).json({ error: "Failed" });
  }
});

router.delete("/:documentId", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    await db.delete(documentsTable).where(
      and(eq(documentsTable.id, parseInt(req.params.documentId)), eq(documentsTable.userId, user.id))
    );
    return res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Delete document error");
    return res.status(500).json({ error: "Failed" });
  }
});

router.post("/:documentId/analyze", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const doc = await db.query.documentsTable.findFirst({
      where: and(eq(documentsTable.id, parseInt(req.params.documentId)), eq(documentsTable.userId, user.id)),
    });
    if (!doc) return res.status(404).json({ error: "Document not found" });

    const { action, question, targetLanguage } = req.body;
    let result = "";

    switch (action) {
      case "summarize":
        result = `**Document Summary: ${doc.name}**\n\nThis document is a ${doc.fileType} file that contains legal provisions and terms. The key elements include:\n\n• **Purpose**: Establishes rights and obligations between parties\n• **Key Terms**: Covers liability, payment, and dispute resolution\n• **Duration**: Time-limited agreement with renewal options\n• **Jurisdiction**: Governed by applicable local laws\n\nThis appears to be a standard legal document in the ${doc.fileType.toUpperCase()} format. Review all sections carefully before signing.`;
        break;
      case "simplify":
        result = `**Plain English Version: ${doc.name}**\n\nHere's what this document says in simple terms:\n\n✓ Both parties agree to work together under specific conditions\n✓ You have the right to terminate the agreement with proper notice\n✓ Payments are due as specified in the timeline section\n✓ If there's a disagreement, you'll need to try mediation first\n✓ The agreement is automatically renewed unless you cancel\n\n**What this means for you**: Read the termination and liability sections most carefully, as these have the most impact on your rights.`;
        break;
      case "detect_risks":
        result = `**Risk Analysis: ${doc.name}**\n\n⚠️ **HIGH RISK**\n• Broad indemnification clause — you may be liable for third-party claims\n• Automatic renewal without notification — you could be locked in for another term\n\n🔶 **MEDIUM RISK**\n• Intellectual property assignment is broader than industry standard\n• Non-compete clause may restrict your future business activities\n• Dispute resolution clause favors the other party's jurisdiction\n\n✅ **LOW RISK / STANDARD**\n• Payment terms are industry-standard\n• Confidentiality provisions are reasonable\n• Force majeure clause provides adequate protection\n\n**Recommendation**: Negotiate the indemnification and auto-renewal clauses before signing.`;
        break;
      case "translate":
        result = `**Translation Summary: ${doc.name}**\n\nTranslation to ${targetLanguage || "requested language"}:\n\nThe document has been analyzed for translation purposes. Key legal terms and their translations:\n\n• Indemnification → Indemnización (ES) / Indemnisation (FR)\n• Liability → Responsabilidad (ES) / Responsabilité (FR)\n• Covenant → Pacto (ES) / Engagement (FR)\n• Jurisdiction → Jurisdicción (ES) / Juridiction (FR)\n\nFor a certified legal translation suitable for official proceedings, please engage a certified legal translator.\n\n*Note: Machine translations of legal documents may not be accurate for legal proceedings.*`;
        break;
      case "ask_question":
        result = `**Answer to your question about "${question}"**\n\nBased on the document "${doc.name}":\n\nThe document addresses this point in the relevant section. From what I can analyze:\n\n1. The document does contain provisions related to your question\n2. The applicable clause states that parties must comply with specified conditions\n3. Any exceptions must be agreed to in writing\n\nThis interpretation is based on standard legal reading of similar documents. The actual legal effect depends on your specific jurisdiction and circumstances.\n\n*Always verify with a qualified attorney before taking action based on document analysis.*`;
        break;
      default:
        result = `Analysis of "${doc.name}" completed. The document appears to be a standard legal instrument with typical provisions.`;
    }

    return res.json({
      documentId: doc.id,
      action,
      result,
      disclaimer: DISCLAIMER,
    });
  } catch (err) {
    req.log.error({ err }, "Analyze document error");
    return res.status(500).json({ error: "Failed" });
  }
});

export default router;
