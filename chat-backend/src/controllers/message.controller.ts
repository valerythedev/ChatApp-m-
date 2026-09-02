import type { Request, Response } from "express";
import fs from "node:fs/promises";
import { prisma } from "../lib/prisma.js";
import { isSupabaseStorageConfigured, uploadFile } from "../lib/supabase.js";
import { findOrCreateDmConversation, getDmConversation } from "../lib/conversation.js";
import { canSendDirectMessage, isMutualContact, listMutualContactIds } from "../lib/contacts.js";
import { isAllowedReactionSymbol } from "../lib/reactions.js";
import { toClientMessage, toPublicUser } from "../lib/serialize.js";
import { paramString } from "../lib/routeParams.js";
import { getIoInstance } from "../socket/instance.js";
import { getSocketIdByUserId } from "../socket/presence.js";

const messageInclude = {
  sender: { select: { id: true, username: true, avatarUrl: true } },
  reactions: { include: { user: { select: { id: true, username: true } } } },
} as const;

export async function getConversationMeta(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }
    const otherUserId = paramString(req.params.userId);
    if (!otherUserId) {
      res.status(400).json({ error: "userId is required." });
      return;
    }
    if (!(await isMutualContact(userId, otherUserId))) {
      res.status(200).json({ conversationId: null });
      return;
    }
    const conv = await getDmConversation(userId, otherUserId);
    res.status(200).json({ conversationId: conv?.id ?? null });
  } catch (error) {
    console.error("getConversationMeta error:", error);
    res.status(500).json({ error: "Failed to resolve conversation." });
  }
}

export async function sendMessage(req: Request, res: Response): Promise<void> {
  try {
    const senderId = req.user?.id;
    if (!senderId) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }
    const { receiverId, text } = req.body as { receiverId?: string; text?: string };
    const file = req.file;

    if (!receiverId) {
      res.status(400).json({ error: "receiverId is required." });
      return;
    }
    const bodyText = typeof text === "string" ? text.trim() : "";
    if (!bodyText && !file) {
      res.status(400).json({ error: "text or file is required." });
      return;
    }

    if (!(await canSendDirectMessage(senderId, receiverId))) {
      res.status(403).json({
        error:
          "You can only message people you are connected with. Send a contact request and wait until they accept (or accept theirs).",
      });
      return;
    }

    const conversation = await findOrCreateDmConversation(senderId, receiverId);

    let mediaUrl: string | null = null;
    let mediaType: string | null = null;
    let fileName: string | null = null;
    if (file) {
      mediaType = file.mimetype;
      fileName = file.originalname;
      if (!isSupabaseStorageConfigured()) {
        mediaUrl = `/uploads/${file.filename}`;
      }
    }

    const newMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId,
        body: bodyText || null,
        mediaUrl,
        mediaType,
        fileName,
      },
      include: messageInclude,
    });

    let messageForClient = newMessage;
    if (file && isSupabaseStorageConfigured()) {
      const buffer = file.buffer ?? (await fs.readFile(file.path));
      const bucket = file.mimetype === "application/pdf" ? "message-files" : "message-media";
      const publicUrl = await uploadFile(bucket, newMessage.id, buffer, file.mimetype);
      await prisma.message.update({
        where: { id: newMessage.id },
        data: { mediaUrl: publicUrl },
      });
      const refreshed = await prisma.message.findUnique({
        where: { id: newMessage.id },
        include: messageInclude,
      });
      if (refreshed) messageForClient = refreshed;
    }

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    const peer = await prisma.user.findUnique({
      where: { id: receiverId },
      select: { username: true },
    });

    const payload = toClientMessage(messageForClient, senderId, receiverId, peer?.username ?? "");

    const io = getIoInstance();
    const recvSocket = getSocketIdByUserId(receiverId);
    if (io && recvSocket) {
      io.to(recvSocket).emit("receiveMessage", payload);
    }
    const senderSocket = getSocketIdByUserId(senderId);
    if (io && senderSocket) {
      io.to(senderSocket).emit("messageSent", payload);
    }

    res.status(201).json({
      message: "Message sent and conversation updated.",
      data: payload,
    });
  } catch (error) {
    console.error("sendMessage error:", error);
    res.status(500).json({ error: "Failed to send message." });
  }
}

export async function getInbox(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }

    const conversations = await prisma.conversation.findMany({
      where: {
        isArchived: false,
        users: { some: { userId } },
      },
      orderBy: { updatedAt: "desc" },
      include: {
        users: {
          include: {
            user: { select: { id: true, username: true, avatarUrl: true } },
          },
        },
        messages: {
          where: { isDeleted: false },
          orderBy: { sentAt: "desc" },
          take: 1,
          include: messageInclude,
        },
      },
    });

    const payload = conversations.map((c) => {
      const participants = c.users.map((u) => toPublicUser(u.user));
      const others = c.users.map((u) => u.user).filter((u) => u.id !== userId);
      const last = c.messages[0];
      return {
        _id: c.id,
        id: c.id,
        conversationId: c.id,
        participants,
        otherUsers: others.map(toPublicUser),
        lastMessage: last
          ? toClientMessage(last, userId, others[0]?.id ?? userId, others[0]?.username ?? "")
          : null,
        updatedAt: c.updatedAt,
      };
    });

    const allowedPeerIds = new Set(await listMutualContactIds(userId));
    const filtered = payload.filter((p) => {
      const other = p.otherUsers[0];
      return other && allowedPeerIds.has(other.id);
    });
    const withUnread = await Promise.all(
      filtered.map(async (row) => {
        const unreadCount = await prisma.message.count({
          where: {
            conversationId: row.conversationId,
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

    res.status(200).json(withUnread.map(({ conversationId: _ignore, ...rest }) => rest));
  } catch (error) {
    console.error("getInbox error:", error);
    res.status(500).json({ error: "Failed to fetch inbox." });
  }
}

export async function getMessages(req: Request, res: Response): Promise<void> {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }
    const otherUserId = paramString(req.params.userId);
    if (!otherUserId) {
      res.status(400).json({ error: "userId is required." });
      return;
    }

    if (!(await isMutualContact(currentUserId, otherUserId))) {
      res.status(403).json({ error: "You are not connected with this user. Accept a contact request first." });
      return;
    }

    const conversation = await getDmConversation(currentUserId, otherUserId);
    if (!conversation) {
      res.status(200).json([]);
      return;
    }

    const other = await prisma.user.findUnique({
      where: { id: otherUserId },
      select: { username: true },
    });

    const messages = await prisma.message.findMany({
      where: { conversationId: conversation.id, isDeleted: false },
      orderBy: { sentAt: "asc" },
      include: messageInclude,
    });

    res.status(200).json(
      messages.map((m) => toClientMessage(m, currentUserId, otherUserId, other?.username ?? ""))
    );
  } catch (error) {
    console.error("getMessages error:", error);
    res.status(500).json({ error: "Failed to fetch messages." });
  }
}

export async function markThreadRead(req: Request, res: Response): Promise<void> {
  try {
    const readerId = req.user?.id;
    if (!readerId) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }
    const { partnerId } = req.body as { partnerId?: string };
    if (!partnerId) {
      res.status(400).json({ error: "partnerId is required." });
      return;
    }

    const conversation = await getDmConversation(readerId, partnerId);
    if (!conversation) {
      res.status(200).json({ ok: true, updated: 0 });
      return;
    }

    const result = await prisma.message.updateMany({
      where: {
        conversationId: conversation.id,
        senderId: partnerId,
        readAt: null,
        isDeleted: false,
      },
      data: { readAt: new Date() },
    });

    const io = getIoInstance();
    io?.emit("readReceiptUpdated", {
      conversationId: conversation.id,
      readerId,
      partnerId,
    });
    const partnerSocket = getSocketIdByUserId(partnerId);
    if (io && partnerSocket) {
      io.to(partnerSocket).emit("messagesRead", { from: readerId, partnerId });
    }

    res.status(200).json({ ok: true, updated: result.count });
  } catch (error) {
    console.error("markThreadRead error:", error);
    res.status(500).json({ error: "Failed to mark messages read." });
  }
}

export async function setMessageReaction(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }
    const messageId = paramString(req.params.messageId);
    const { reaction } = req.body as { reaction?: unknown };
    if (!messageId || typeof reaction !== "string") {
      res.status(400).json({ error: "messageId and reaction (string) are required." });
      return;
    }
    const sym = reaction.trim();
    if (!isAllowedReactionSymbol(sym)) {
      res.status(400).json({ error: "Invalid reaction symbol." });
      return;
    }

    const msg = await prisma.message.findFirst({
      where: { id: messageId, isDeleted: false },
      include: {
        conversation: { include: { users: { select: { userId: true } } } },
      },
    });
    if (!msg) {
      res.status(404).json({ error: "Message not found." });
      return;
    }
    if (!msg.conversation.users.some((u) => u.userId === userId)) {
      res.status(403).json({ error: "Not a participant in this conversation." });
      return;
    }

    const existing = await prisma.messageReaction.findUnique({
      where: { messageId_userId: { messageId, userId } },
    });

    if (existing?.symbol === sym) {
      await prisma.messageReaction.delete({ where: { id: existing.id } });
    } else if (existing) {
      await prisma.messageReaction.update({
        where: { id: existing.id },
        data: { symbol: sym },
      });
    } else {
      await prisma.messageReaction.create({
        data: { messageId, userId, symbol: sym },
      });
    }

    const rows = await prisma.messageReaction.findMany({
      where: { messageId },
      include: { user: { select: { id: true, username: true } } },
      orderBy: { createdAt: "asc" },
    });
    const reactions = rows.map((r) => ({
      symbol: r.symbol,
      userId: r.userId,
      username: r.user.username,
    }));

    const partnerId = msg.conversation.users.map((u) => u.userId).find((id) => id !== userId);
    if (!partnerId) {
      res.status(500).json({ error: "Conversation has no peer." });
      return;
    }

    const io = getIoInstance();
    const payload = { messageId, reactions };
    const selfSocket = getSocketIdByUserId(userId);
    const peerSocket = getSocketIdByUserId(partnerId);
    if (io && selfSocket) {
      io.to(selfSocket).emit("messageReactions", { ...payload, peerId: partnerId });
    }
    if (io && peerSocket) {
      io.to(peerSocket).emit("messageReactions", { ...payload, peerId: userId });
    }

    res.status(200).json({ ok: true, messageId, reactions });
  } catch (error) {
    console.error("setMessageReaction error:", error);
    res.status(500).json({ error: "Failed to set reaction." });
  }
}

export async function deleteMessage(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }
    const messageId = paramString(req.params.messageId);
    if (!messageId) {
      res.status(400).json({ error: "messageId is required." });
      return;
    }
    const msg = await prisma.message.findUnique({ where: { id: messageId } });
    if (!msg || msg.senderId !== userId) {
      res.status(404).json({ error: "Message not found." });
      return;
    }
    await prisma.message.delete({ where: { id: messageId } });
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error("deleteMessage error:", error);
    res.status(500).json({ error: "Failed to delete message." });
  }
}
