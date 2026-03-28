import type { Server } from "socket.io";
import { canSendDirectMessage } from "../lib/contacts.js";
import { prisma } from "../lib/prisma.js";
import { findOrCreateDmConversation, getDmConversation } from "../lib/conversation.js";
import { toClientMessage } from "../lib/serialize.js";
import * as presence from "./presence.js";

export function registerSocketHandlers(io: Server): void {
  io.on("connection", (socket) => {
    socket.on("join", (user: { id: string; username: string }) => {
      presence.setSocketUser(socket.id, { id: user.id, username: user.username });
      io.emit("users", presence.listOnlineUsers());
    });

    socket.on("privateMessage", async (msg: { from: string; to: string; text?: string }) => {
      try {
        const text = typeof msg.text === "string" ? msg.text.trim() : "";
        if (!text || !msg.from || !msg.to) return;

        if (!(await canSendDirectMessage(msg.from, msg.to))) return;

        const conversation = await findOrCreateDmConversation(msg.from, msg.to);

        const saved = await prisma.message.create({
          data: {
            conversationId: conversation.id,
            senderId: msg.from,
            body: text,
          },
          include: { sender: { select: { id: true, username: true, avatarUrl: true } } },
        });

        await prisma.conversation.update({
          where: { id: conversation.id },
          data: { updatedAt: new Date() },
        });

        const peer = await prisma.user.findUnique({
          where: { id: msg.to },
          select: { username: true },
        });

        const payload = toClientMessage(saved, msg.from, msg.to, peer?.username ?? "");

        const recvSocketId = presence.getSocketIdByUserId(msg.to);
        if (recvSocketId) {
          io.to(recvSocketId).emit("receiveMessage", payload);
        }

        io.to(socket.id).emit("messageSent", payload);
      } catch (err) {
        console.error("❌ [socket] Error processing privateMessage:", err);
      }
    });

    socket.on("typing", (toId: string) => {
      const recvSocket = presence.getSocketIdByUserId(toId);
      const sender = presence.getUserBySocket(socket.id);
      if (recvSocket && sender) {
        io.to(recvSocket).emit("typing", { ...sender, socketId: socket.id });
      }
    });

    socket.on("markAsRead", async (payload: { from: string; to: string }) => {
      try {
        const { from, to } = payload;
        const conversation = await getDmConversation(from, to);
        if (!conversation) return;

        await prisma.message.updateMany({
          where: {
            conversationId: conversation.id,
            senderId: from,
            readAt: null,
            isDeleted: false,
          },
          data: { readAt: new Date() },
        });

        const partnerSocketId = presence.getSocketIdByUserId(from);
        if (partnerSocketId) {
          io.to(partnerSocketId).emit("messagesRead", { from: to, partnerId: from });
        }
        io.emit("readReceiptUpdated", { conversationId: conversation.id, readerId: to, partnerId: from });
      } catch (err) {
        console.error("❌ Error marking read:", err);
      }
    });

    socket.on("disconnect", () => {
      presence.removeSocket(socket.id);
      io.emit("users", presence.listOnlineUsers());
    });
  });
}
