export interface MessageReactionItem {
  symbol: string;
  userId: string;
  username: string;
}

export interface UserPublic {
  id: string;
  _id: string;
  username: string;
  profilePic: string;
  avatarUrl: string | null;
}

export interface ChatMessage {
  _id: string;
  id: string;
  text: string;
  body?: string | null;
  from: string;
  to: string;
  sender: string;
  receiver: string;
  fromAvatar?: string;
  toAvatar?: string;
  timestamp: string;
  sentAt: string;
  readAt: string | null;
  isRead: boolean;
  mediaUrl?: string | null;
  mediaType?: string | null;
  fileName?: string | null;
  reactions?: MessageReactionItem[];
}

export interface ConversationUser {
  userId: string;
  conversationId: string;
  joinedAt: string;
}

export interface InboxConversation {
  _id: string;
  id: string;
  participants: UserPublic[];
  otherUsers: UserPublic[];
  lastMessage: ChatMessage | null;
  updatedAt: string;
  unreadCount: number;
}

export interface ArchivedConversationRow {
  id: string;
  archivedAt: string | null;
  updatedAt: string;
  unreadCount: number;
}

export interface ContactRequestItem {
  id: string;
  createdAt: string;
  from?: UserPublic;
  to?: UserPublic;
}

export type SendContactRequestResult =
  | { status: "pending"; request: { id: string; to: UserPublic } }
  | { status: "connected"; user: UserPublic };
