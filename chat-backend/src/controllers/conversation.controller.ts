import type { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { paramString } from "../lib/routeParams.js";

export async function archiveConversation(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }
    const conversationId = paramString(req.params.conversationId);
    if (!conversationId) {
      res.status(400).json({ error: "conversationId is required." });
      return;
    }
    const membership = await prisma.conversationUser.findUnique({
      where: { userId_conversationId: { userId, conversationId } },
    });
    if (!membership) {
      res.status(404).json({ error: "Conversation not found." });
      return;
    }
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { isArchived: true, archivedAt: new Date() },
    });
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error("archiveConversation error:", error);
    res.status(500).json({ error: "Failed to archive conversation." });
  }
}

export async function restoreConversation(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }
    const conversationId = paramString(req.params.conversationId);
    if (!conversationId) {
      res.status(400).json({ error: "conversationId is required." });
      return;
    }
    const membership = await prisma.conversationUser.findUnique({
      where: { userId_conversationId: { userId, conversationId } },
    });
    if (!membership) {
      res.status(404).json({ error: "Conversation not found." });
      return;
    }
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { isArchived: false, archivedAt: null },
    });
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error("restoreConversation error:", error);
    res.status(500).json({ error: "Failed to restore conversation." });
  }
}

export async function listArchived(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }
    const rows = await prisma.conversation.findMany({
      where: {
        isArchived: true,
        users: { some: { userId } },
      },
      orderBy: { archivedAt: "desc" },
      select: { id: true, archivedAt: true, updatedAt: true },
    });
    const withUnread = await Promise.all(
      rows.map(async (row) => {
        const unreadCount = await prisma.message.count({
          where: {
            conversationId: row.id,
            isDeleted: false,
            senderId: { not: userId },
            readAt: null,
          },
        });
        return {
          ...row,
          unreadCount,
        };
      })
    );
    res.status(200).json(withUnread);
  } catch (error) {
    console.error("listArchived error:", error);
    res.status(500).json({ error: "Failed to list archived conversations." });
  }
}
