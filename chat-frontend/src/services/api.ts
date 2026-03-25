import { appConfig } from "@/config";
import type {
  ArchivedConversationRow,
  ChatMessage,
  InboxConversation,
  UserPublic,
} from "@/types/chat";

export const CLIENT_ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "video/mp4",
  "video/webm",
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  "audio/webm",
  "application/pdf",
]);

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

function authHeaders(): HeadersInit {
  const token = localStorage.getItem("token");
  const h: Record<string, string> = { Accept: "application/json" };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${appConfig.apiOrigin}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: { ...authHeaders(), ...init?.headers },
    credentials: "include",
  });
  if (!res.ok) {
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      body = await res.text();
    }
    const msg = typeof body === "object" && body && "error" in body ? String((body as { error: string }).error) : res.statusText;
    throw new ApiError(msg || "Request failed", res.status, body);
  }
  return parseJson<T>(res);
}

export async function loginRequest(username: string, password: string): Promise<{
  token: string;
  user: UserPublic & { id: string; _id: string };
}> {
  return apiFetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
}

export async function signupRequest(payload: {
  fullName?: string;
  username: string;
  password: string;
  confirmPassword: string;
  email?: string;
  age?: number;
}): Promise<{ message: string }> {
  return apiFetch("/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

/** Your contact list (People tab). Not every user on the app. */
export async function fetchUsers(): Promise<UserPublic[]> {
  return apiFetch("/api/auth/users");
}

export async function addContactRequest(username: string): Promise<UserPublic> {
  return apiFetch("/api/auth/contacts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username }),
  });
}

export async function removeContactRequest(contactId: string): Promise<{ ok: boolean }> {
  return apiFetch(`/api/auth/contacts/${encodeURIComponent(contactId)}`, {
    method: "DELETE",
  });
}

export async function fetchInbox(): Promise<InboxConversation[]> {
  return apiFetch("/api/msg/inbox");
}

export async function fetchMessages(peerUserId: string): Promise<ChatMessage[]> {
  return apiFetch(`/api/msg/${encodeURIComponent(peerUserId)}`);
}

export async function markThreadRead(partnerId: string): Promise<{ ok: boolean; updated: number }> {
  return apiFetch("/api/msg/read", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ partnerId }),
  });
}

export async function fetchConversationMeta(peerUserId: string): Promise<{ conversationId: string | null }> {
  return apiFetch(`/api/msg/meta/${encodeURIComponent(peerUserId)}`);
}

export async function sendMessageRequest(form: FormData): Promise<{ data: ChatMessage }> {
  return apiFetch("/api/msg/send", {
    method: "POST",
    body: form,
  });
}

export async function deleteMessageRequest(messageId: string): Promise<{ ok: boolean }> {
  return apiFetch(`/api/msg/message/${encodeURIComponent(messageId)}`, { method: "DELETE" });
}

export async function archiveConversationRequest(conversationId: string): Promise<{ ok: boolean }> {
  return apiFetch(`/api/conversations/${encodeURIComponent(conversationId)}/archive`, { method: "POST" });
}

export async function restoreConversationRequest(conversationId: string): Promise<{ ok: boolean }> {
  return apiFetch(`/api/conversations/${encodeURIComponent(conversationId)}/restore`, { method: "POST" });
}

export async function fetchArchivedConversations(): Promise<ArchivedConversationRow[]> {
  return apiFetch("/api/conversations/archived");
}

export async function uploadAvatarRequest(file: File): Promise<UserPublic> {
  const fd = new FormData();
  fd.append("avatar", file);
  const res = await fetch(`${appConfig.apiOrigin}/api/auth/me/avatar`, {
    method: "PATCH",
    headers: authHeaders(),
    body: fd,
    credentials: "include",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError("Avatar upload failed", res.status, body);
  }
  return res.json() as Promise<UserPublic>;
}

export function mediaUrlToAbsolute(pathOrUrl: string | null | undefined): string | null {
  if (!pathOrUrl) return null;
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) return pathOrUrl;
  return `${appConfig.apiOrigin}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}

export function assertFileAllowed(file: File): void {
  if (!CLIENT_ALLOWED_MIME.has(file.type)) {
    throw new Error(`File type not allowed: ${file.type || "unknown"}`);
  }
  const maxBytes = appConfig.maxUploadMb * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error(`File too large (max ${appConfig.maxUploadMb} MB)`);
  }
}
