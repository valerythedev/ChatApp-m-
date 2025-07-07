// backend/socket/io.js
import Message from "../models/message.model.js";
import Conversation from "../models/conversation.model.js";

const connectedUsers = new Map();

// Helper para encontrar socketId por user.id
const getSocketIdByUserId = (userId) => {
  for (const [, u] of connectedUsers.entries()) {
    if (u.id === userId) return u.socketId;
  }
  return null;
};

export const registerSocketHandlers = (io) => {
  io.on("connection", (socket) => {
    console.log("🟢 Nuevo socket conectado:", socket.id);

    socket.on("join", (user) => {
      connectedUsers.set(socket.id, { ...user, socketId: socket.id });
      io.emit("users", Array.from(connectedUsers.values()));
      console.log("✅ Usuario unido:", user.username);
    });

    socket.on("privateMessage", async (msg) => {
      console.log("🔔 [socket] privateMessage recibido:", msg);

      try {
        // 1) Persistir en la colección de mensajes
        const saved = await Message.create({
          sender: msg.from,
          receiver: msg.to,
          text: msg.text,
          conversationId: [msg.from, msg.to].sort().join("_"),
        });
        console.log("✅ [socket] Mensaje guardado en DB:", saved._id);

        // 2) Upsert de la conversación
        const participants = [msg.from, msg.to];
        let conv = await Conversation.findOne({
          participants: { $all: participants }
        });

        if (!conv) {
          conv = await Conversation.create({
            participants,
            messages: [saved._id],
            lastMessage: saved._id
          });
          console.log("🗨️  [socket] Conversación creada:", conv._id);
        } else {
          conv.messages.push(saved._id);
          conv.lastMessage = saved._id;
          conv.updatedAt = Date.now();
          await conv.save();
          console.log("🗨️  [socket] Conversación actualizada:", conv._id);
        }

        // 3) Emitir solo al receptor
        const recvSocketId = getSocketIdByUserId(msg.to);
        if (recvSocketId) {
          io.to(recvSocketId).emit("receiveMessage", {
            ...msg,
            _id: saved._id,
            isRead: saved.isRead,
            timestamp: saved.createdAt,
          });
        }


      } catch (err) {
        console.error("❌ [socket] Error procesando privateMessage:", err);
      }
    });

    socket.on("typing", (toId) => {
      const recvSocket = getSocketIdByUserId(toId);
      const sender = connectedUsers.get(socket.id);
      if (recvSocket && sender) {
        io.to(recvSocket).emit("typing", sender);
      }
    });
    socket.on("markAsRead", async ({ from, to }) => {
      try {
        const conversationId = [from, to].sort().join("_");

        // 🔁 Marca todos los mensajes como leídos donde el destinatario es 'to' y el remitente es 'from'
        await Message.updateMany(
          { from, to, conversationId, isRead: { $ne: true } },
          { $set: { isRead: true } }
        );

        const receiverSocketId = getSocketIdByUserId(from);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("messagesRead", { from: to });
        }

        console.log(`📬 Mensajes de ${from} a ${to} marcados como leídos`);
      } catch (err) {
        console.error("❌ Error al marcar como leídos:", err);
      }
    });

    socket.on("disconnect", () => {
      const u = connectedUsers.get(socket.id);
      connectedUsers.delete(socket.id);
      console.log("🔴 Usuario desconectado:", u?.username || socket.id);
      io.emit("users", Array.from(connectedUsers.values()));
    });
  });
};
