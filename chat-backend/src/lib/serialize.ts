import type { Message, MessageReaction, User } from "../generated/prisma/client.js";

export function toPublicUser(u: Pick<User, "id" | "username" | "avatarUrl">) {
  return {
    id: u.id,
    _id: u.id,
    username: u.username,
    profilePic: u.avatarUrl ?? "",
    avatarUrl: u.avatarUrl,
  };
}

type MessageWithSender = Message & {
  sender: Pick<User, "id" | "username" | "avatarUrl">;
  reactions?: (Pick<MessageReaction, "symbol" | "userId"> & {
    user: Pick<User, "id" | "username">;
  })[];
};

export function toClientMessage(
  m: MessageWithSender,
  currentUserId: string,
  otherUserId: string,
  otherUsername: string
) {
  const to = m.senderId === currentUserId ? otherUserId : currentUserId;
  return {
    _id: m.id,
    id: m.id,
    text: m.body ?? "",
    body: m.body,
    from: m.senderId,
    to,
    sender: m.sender.username,
    receiver: otherUsername,
    fromAvatar: m.sender.avatarUrl ?? "",
    toAvatar: "",
    timestamp: m.sentAt.toISOString(),
    sentAt: m.sentAt.toISOString(),
    readAt: m.readAt?.toISOString() ?? null,
    isRead: m.readAt != null,
    mediaUrl: m.mediaUrl,
    mediaType: m.mediaType,
    fileName: m.fileName,
    reactions: (m.reactions ?? []).map((r) => ({
      symbol: r.symbol,
      userId: r.userId,
      username: r.user.username,
    })),
  };
}
