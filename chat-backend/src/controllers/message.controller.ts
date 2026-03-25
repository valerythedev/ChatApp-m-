import type { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { findOrCreateDmConversation, getDmConversation } from "../lib/conversation.js";
import { canSendDirectMessage } from "../lib/contacts.js";
import { toClientMessage, toPublicUser } from "../lib/serialize.js";
import { paramString } from "../lib/routeParams.js";
import { getIoInstance } from "../socket/instance.js";
import { getSocketIdByUserId } from "../socket/presence.js";

async function resetSenderReadState(conversationId: string, senderId: string, exceptMessageId: string) {
  await prisma.message.updateMany({
    where: { conversationId, senderId, id: { not: exceptMessageId }, isDeleted: false },
    data: { readAt: null },
  });
}

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
          "Add this person to your contacts to start a chat, or reply from an existing conversation.",
      });
      return;
    }

    const conversation = await findOrCreateDmConversation(senderId, receiverId);

    let mediaUrl: string | null = null;
    let mediaType: string | null = null;
    let fileName: string | null = null;
    if (file) {
      mediaUrl = `/uploads/${file.filename}`;
      mediaType = file.mimetype;
      fileName = file.originalname;
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
      include: { sender: { select: { id: true, username: true, avatarUrl: true } } },
    });

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    await resetSenderReadState(conversation.id, senderId, newMessage.id);

    const peer = await prisma.user.findUnique({
      where: { id: receiverId },
      select: { username: true },
    });

    const payload = toClientMessage(newMessage, senderId, receiverId, peer?.username ?? "");

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
          include: {
            sender: { select: { id: true, username: true, avatarUrl: true } },
          },
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
        participants,
        otherUsers: others.map(toPublicUser),
        lastMessage: last
          ? toClientMessage(last, userId, others[0]?.id ?? userId, others[0]?.username ?? "")
          : null,
        updatedAt: c.updatedAt,
      };
    });

    res.status(200).json(payload);
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
      include: { sender: { select: { id: true, username: true, avatarUrl: true } } },
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
