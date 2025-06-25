import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    conversationId: {
      type: String,
      required: true
    }
  },
  {
    timestamps: true // Esto crea createdAt y updatedAt automáticamente
  }
);

const Message = mongoose.model("Message", messageSchema);
export default Message;
