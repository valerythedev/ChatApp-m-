import Message from "../models/message.model.js";
import Conversation from "../models/conversation.model.js";

// ✅ Enviar un mensaje
export const sendMessage = async (req, res) => {
  try {
    const senderId = req.user.id;
    const { receiverId, text } = req.body;

    if (!receiverId || !text) {
      return res.status(400).json({ error: "receiverId and text are required." });
    }

    const conversationId = [senderId, receiverId].sort().join("_");

    const newMessage = await Message.create({
      sender: senderId,
      receiver: receiverId,
      text,
      conversationId
    });

    let conversation = await Conversation.findOne({
      participants: { $all: [senderId, receiverId] }
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [senderId, receiverId],
        lastMessage: newMessage._id
      });
    } else {
      conversation.lastMessage = newMessage._id;
      conversation.updatedAt = Date.now();
      await conversation.save();
    }

    res.status(201).json({
      message: "Message sent and conversation updated.",
      data: newMessage
    });

  } catch (error) {
    console.error("sendMessage error:", error);
    res.status(500).json({ error: "Failed to send message." });
  }
};

// ✅ Obtener la bandeja de entrada
export const getInbox = async (req, res) => {
  try {
    const userId = req.user.id;

    const conversations = await Conversation.find({
      participants: userId
    })
      .populate("participants", "username profilePic")
      .populate("lastMessage")
      .sort({ updatedAt: -1 });

    res.status(200).json(conversations);
  } catch (error) {
    console.error("getInbox error:", error);
    res.status(500).json({ error: "Failed to fetch inbox." });
  }
};

// ✅ Obtener todos los mensajes entre dos usuarios
// ✅ Obtener todos los mensajes entre dos usuarios
export const getMessages = async (req, res) => {
  try {
    const userA = req.user.id;
    const userB = req.params.userId;

    const conversationId = [userA, userB].sort().join("_");

    const messages = await Message.find({ conversationId })
      .sort("createdAt")
      .populate("sender", "username profilePic")
      .populate("receiver", "username profilePic");

    const transformedMessages = messages.map((msg) => ({
      _id: msg._id,
      text: msg.text,
      from: msg.sender._id,
      to: msg.receiver._id,
      sender: msg.sender.username,
      receiver: msg.receiver.username,
      fromAvatar: msg.sender.profilePic,
      toAvatar: msg.receiver.profilePic,
      timestamp: msg.createdAt,
      isRead: msg.isRead || false,
    }));

    res.status(200).json(transformedMessages);
  } catch (error) {
    console.error("getMessages error:", error);
    res.status(500).json({ error: "Failed to fetch messages." });
  }
};



