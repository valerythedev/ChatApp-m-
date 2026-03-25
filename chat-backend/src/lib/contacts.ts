import { getDmConversation } from "./conversation.js";
import { prisma } from "./prisma.js";

export async function isContact(ownerId: string, contactId: string): Promise<boolean> {
  const row = await prisma.userContact.findUnique({
    where: { ownerId_contactId: { ownerId, contactId } },
    select: { ownerId: true },
  });
  return Boolean(row);
}

/** New DMs: you must have them on your list. Replies: allowed if a thread with messages already exists. */
export async function canSendDirectMessage(senderId: string, receiverId: string): Promise<boolean> {
  if (await isContact(senderId, receiverId)) return true;
  const conv = await getDmConversation(senderId, receiverId);
  if (!conv) return false;
  const n = await prisma.message.count({
    where: { conversationId: conv.id, isDeleted: false },
  });
  return n > 0;
}
