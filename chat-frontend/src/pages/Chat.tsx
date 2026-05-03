import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { differenceInHours, format } from "date-fns";
import { Loader2, Mic, Square } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ComposeInput } from "@/components/chat/ComposeInput";
import { SwipeRow } from "@/components/chat/SwipeRow";
import { MessageMedia } from "@/components/MessageMedia";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getSocket } from "@/socket";
import {
  acceptContactRequestApi,
  archiveConversationRequest,
  assertFileAllowed,
  cancelContactRequestApi,
  deleteMessageRequest,
  fetchArchivedConversations,
  fetchIncomingContactRequests,
  fetchInbox,
  fetchMessages,
  fetchMe,
  fetchOutgoingContactRequests,
  fetchUsers,
  markThreadRead,
  rejectContactRequestApi,
  removeContactRequest,
  restoreConversationRequest,
  sendContactRequest,
  sendMessageRequest,
  uploadAvatarRequest,
  mediaUrlToAbsolute,
} from "@/services/api";
import type { ChatMessage, InboxConversation, UserPublic } from "@/types/chat";

type SidebarTab = "chats" | "people" | "archived";

type IncomingMessageAlert = {
  id: string;
  fromId: string;
  sender: string;
  preview: string;
};

function avatarSrc(u: Pick<UserPublic, "profilePic" | "avatarUrl">): string | null {
  return mediaUrlToAbsolute(u.profilePic || u.avatarUrl || null);
}

function parseStoredUser(): UserPublic | null {
  const raw = localStorage.getItem("user");
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<UserPublic> & { id?: string; _id?: string };
    const id = parsed.id ?? parsed._id;
    if (!id || !parsed.username) return null;
    return {
      id,
      _id: id,
      username: parsed.username,
      profilePic: parsed.profilePic ?? "",
      avatarUrl: parsed.avatarUrl ?? null,
    };
  } catch {
    return null;
  }
}

function formatReceipt(msg: ChatMessage): string {
  if (!msg.readAt) {
    return `sent ${format(new Date(msg.sentAt), "HH:mm")}`;
  }
  const read = new Date(msg.readAt);
  if (differenceInHours(new Date(), read) >= 24) {
    return "read (over 24hrs)";
  }
  return `read ${format(read, "HH:mm")}`;
}

function Chat() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [user, setUser] = useState<UserPublic | null>(() => parseStoredUser());
  const [selectedPeer, setSelectedPeer] = useState<UserPublic | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("chats");
  const [input, setInput] = useState("");
  const [peerIsTyping, setPeerIsTyping] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Array<{ id: string; username: string; socketId: string }>>([]);
  const [messageAlerts, setMessageAlerts] = useState<IncomingMessageAlert[]>([]);
  const [menuForMessageId, setMenuForMessageId] = useState<string | null>(null);
  const [addContactUsername, setAddContactUsername] = useState("");
  const selectedPeerRef = useRef<UserPublic | null>(null);
  selectedPeerRef.current = selectedPeer;
  const selectedPeerIdRef = useRef<string | null>(null);
  selectedPeerIdRef.current = selectedPeer?.id ?? null;
  const [recording, setRecording] = useState<MediaRecorder | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const userId = user?.id ?? "";

  useEffect(() => {
    if (!localStorage.getItem("token")) {
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    if (user) return;
    if (!localStorage.getItem("token")) return;
    let cancelled = false;
    void fetchMe()
      .then((u) => {
        if (cancelled) return;
        localStorage.setItem("user", JSON.stringify(u));
        setUser(u);
      })
      .catch(() => {
        if (cancelled) return;
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login", { replace: true });
      });
    return () => {
      cancelled = true;
    };
  }, [user, navigate]);

  useEffect(() => {
    if (!user) return;
    const socket = getSocket();
    socket.emit("join", { id: user.id, username: user.username });
  }, [user]);

  useEffect(() => {
    const socket = getSocket();
    const onUsers = (list: Array<{ id: string; username: string; socketId: string }>) => setOnlineUsers(list);
    socket.on("users", onUsers);
    return () => {
      socket.off("users", onUsers);
    };
  }, []);

  const usersQuery = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
    enabled: Boolean(user),
  });

  const incomingRequestsQuery = useQuery({
    queryKey: ["contactRequests", "incoming"],
    queryFn: fetchIncomingContactRequests,
    enabled: Boolean(user),
  });

  const outgoingRequestsQuery = useQuery({
    queryKey: ["contactRequests", "outgoing"],
    queryFn: fetchOutgoingContactRequests,
    enabled: Boolean(user),
  });

  const inboxQuery = useQuery({
    queryKey: ["inbox"],
    queryFn: fetchInbox,
    enabled: Boolean(user),
  });

  const archivedQuery = useQuery({
    queryKey: ["archived"],
    queryFn: fetchArchivedConversations,
    enabled: Boolean(user) && sidebarTab === "archived",
  });

  const messagesQuery = useQuery({
    queryKey: ["messages", selectedPeer?.id],
    queryFn: () => fetchMessages(selectedPeer!.id),
    enabled: Boolean(user && selectedPeer),
  });

  // Strong read-sync: when opening a thread, explicitly mark read via HTTP.
  useEffect(() => {
    if (!user || !selectedPeer) return;
    if (document.visibilityState !== "visible") return;
    void markThreadRead(selectedPeer.id)
      .then(() => {
        void qc.invalidateQueries({ queryKey: ["messages", selectedPeer.id] });
        void qc.invalidateQueries({ queryKey: ["inbox"] });
        void qc.invalidateQueries({ queryKey: ["archived"] });
      })
      .catch(() => undefined);
  }, [user, selectedPeer?.id, messagesQuery.data?.length, qc]);

  const emitMarkRead = useCallback(() => {
    if (!user || !selectedPeer) return;
    if (document.visibilityState !== "visible") return;
    getSocket().emit("markAsRead", { from: selectedPeer.id, to: user.id });
  }, [user, selectedPeer]);

  useEffect(() => {
    window.addEventListener("focus", emitMarkRead);
    document.addEventListener("visibilitychange", emitMarkRead);
    return () => {
      window.removeEventListener("focus", emitMarkRead);
      document.removeEventListener("visibilitychange", emitMarkRead);
    };
  }, [emitMarkRead]);

  useEffect(() => {
    setPeerIsTyping(false);
    if (typingTimer.current) {
      clearTimeout(typingTimer.current);
      typingTimer.current = null;
    }
  }, [selectedPeer?.id]);

  useEffect(() => {
    const socket = getSocket();
    const onRecv = (msg: ChatMessage) => {
      const other = String(msg.from) === userId ? msg.to : msg.from;
      void qc.invalidateQueries({ queryKey: ["messages", other] });
      void qc.invalidateQueries({ queryKey: ["inbox"] });

      if (String(msg.from) === String(userId)) return;
      const activeThread = selectedPeer?.id && String(selectedPeer.id) === String(msg.from);
      const shouldNotify = !activeThread || document.visibilityState !== "visible";
      if (!shouldNotify) return;

      const preview = msg.text?.trim() || "[attachment]";
      setMessageAlerts((prev) => [
        ...prev,
        {
          id: String(msg._id),
          fromId: String(msg.from),
          sender: msg.sender?.trim() || "user",
          preview: preview.length > 160 ? `${preview.slice(0, 157)}…` : preview,
        },
      ]);
    };
    const onSent = (msg: ChatMessage) => {
      const other = String(msg.from) === userId ? msg.to : msg.from;
      void qc.invalidateQueries({ queryKey: ["messages", other] });
      void qc.invalidateQueries({ queryKey: ["inbox"] });
    };
    const onTyping = (who: { id?: string; username?: string }) => {
      const openId = selectedPeerIdRef.current;
      if (import.meta.env.DEV) {
        console.log("[typing] socket event", who, "openThread", openId);
      }
      if (!who?.id || !who.username || !openId) return;
      if (String(who.id) !== String(openId)) return;
      setPeerIsTyping(true);
      if (typingTimer.current) clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => setPeerIsTyping(false), 2500);
    };
    const onRead = () => {
      void qc.invalidateQueries({ queryKey: ["messages", selectedPeer?.id] });
      void qc.invalidateQueries({ queryKey: ["inbox"] });
      void qc.invalidateQueries({ queryKey: ["archived"] });
    };
    const onReceipt = () => {
      void qc.invalidateQueries({ queryKey: ["messages"] });
      void qc.invalidateQueries({ queryKey: ["inbox"] });
      void qc.invalidateQueries({ queryKey: ["archived"] });
    };
    socket.on("receiveMessage", onRecv);
    socket.on("messageSent", onSent);
    socket.on("typing", onTyping);
    socket.on("messagesRead", onRead);
    socket.on("readReceiptUpdated", onReceipt);
    return () => {
      socket.off("receiveMessage", onRecv);
      socket.off("messageSent", onSent);
      socket.off("typing", onTyping);
      socket.off("messagesRead", onRead);
      socket.off("readReceiptUpdated", onReceipt);
    };
  }, [qc, userId, selectedPeer?.id]);

  useEffect(() => {
    if (!selectedPeer || !input) return;
    const socket = getSocket();
    socket.emit("typing", selectedPeer.id);
  }, [input, selectedPeer]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messagesQuery.data]);

  const sendMutation = useMutation({
    mutationFn: async (payload: { text: string; file?: File | null }) => {
      if (!selectedPeer) throw new Error("No peer selected");
      const fd = new FormData();
      fd.append("receiverId", selectedPeer.id);
      if (payload.text.trim()) fd.append("text", payload.text.trim());
      if (payload.file) {
        assertFileAllowed(payload.file);
        fd.append("file", payload.file);
      }
      return sendMessageRequest(fd);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["messages", selectedPeer?.id] });
      void qc.invalidateQueries({ queryKey: ["inbox"] });
    },
    onError: (err) => {
      alert(err instanceof Error ? err.message : "Send failed");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (messageId: string) => deleteMessageRequest(messageId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["messages", selectedPeer?.id] });
      void qc.invalidateQueries({ queryKey: ["inbox"] });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (conversationId: string) => archiveConversationRequest(conversationId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["inbox"] });
      void qc.invalidateQueries({ queryKey: ["archived"] });
      setSelectedPeer(null);
      setSelectedConversationId(null);
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (conversationId: string) => restoreConversationRequest(conversationId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["inbox"] });
      void qc.invalidateQueries({ queryKey: ["archived"] });
    },
  });

  const avatarMutation = useMutation({
    mutationFn: (file: File) => uploadAvatarRequest(file),
    onSuccess: (u) => {
      localStorage.setItem("user", JSON.stringify(u));
      setUser(u);
      void qc.invalidateQueries({ queryKey: ["users"] });
      void qc.invalidateQueries({ queryKey: ["messages"] });
    },
  });

  const inboxPeers = useMemo(() => {
    const rows = inboxQuery.data ?? [];
    return rows
      .map((c) => {
        const other = c.otherUsers[0];
        if (!other) return null;
        return { conversation: c, peer: other };
      })
      .filter((x): x is { conversation: InboxConversation; peer: UserPublic } => Boolean(x));
  }, [inboxQuery.data]);

  const inboxPeerIds = useMemo(() => new Set(inboxPeers.map((p) => p.peer.id)), [inboxPeers]);

  const contacts = usersQuery.data ?? [];
  const incomingRequestCount = (incomingRequestsQuery.data ?? []).length;
  const chatsUnreadMessages = inboxPeers.reduce((sum, row) => sum + (row.conversation.unreadCount ?? 0), 0);
  const archivedUnreadMessages = (archivedQuery.data ?? []).reduce((sum, row) => sum + (row.unreadCount ?? 0), 0);
  const chatsUnreadThreads = inboxPeers.filter((row) => (row.conversation.unreadCount ?? 0) > 0).length;
  const archivedUnreadThreads = (archivedQuery.data ?? []).filter((row) => (row.unreadCount ?? 0) > 0).length;
  const unreadMessagesCount = chatsUnreadMessages + archivedUnreadMessages;

  useEffect(() => {
    const titleBase = "Tiny Chat";
    document.title = unreadMessagesCount > 0 ? `(${unreadMessagesCount}) ${titleBase}` : titleBase;
    return () => {
      document.title = titleBase;
    };
  }, [unreadMessagesCount]);

  const peopleWithoutChat = useMemo(() => {
    return contacts.filter((u) => !inboxPeerIds.has(u.id) && u.id !== userId);
  }, [contacts, inboxPeerIds, userId]);

  const addContactMutation = useMutation({
    mutationFn: (username: string) => sendContactRequest(username),
    onSuccess: (data) => {
      setAddContactUsername("");
      void qc.invalidateQueries({ queryKey: ["contactRequests", "incoming"] });
      void qc.invalidateQueries({ queryKey: ["contactRequests", "outgoing"] });
      if (data.status === "connected") {
        void qc.invalidateQueries({ queryKey: ["users"] });
        void qc.invalidateQueries({ queryKey: ["inbox"] });
      }
    },
  });

  const acceptRequestMutation = useMutation({
    mutationFn: (requestId: string) => acceptContactRequestApi(requestId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["contactRequests", "incoming"] });
      void qc.invalidateQueries({ queryKey: ["users"] });
      void qc.invalidateQueries({ queryKey: ["inbox"] });
    },
  });

  const rejectRequestMutation = useMutation({
    mutationFn: (requestId: string) => rejectContactRequestApi(requestId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["contactRequests", "incoming"] });
    },
  });

  const cancelRequestMutation = useMutation({
    mutationFn: (requestId: string) => cancelContactRequestApi(requestId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["contactRequests", "outgoing"] });
    },
  });

  const removeContactMutation = useMutation({
    mutationFn: (contactId: string) => removeContactRequest(contactId),
    onSuccess: (_data, contactId) => {
      void qc.invalidateQueries({ queryKey: ["users"] });
      if (selectedPeerRef.current?.id === contactId) {
        setSelectedPeer(null);
        setSelectedConversationId(null);
      }
    },
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPeer || (!input.trim() && !recording)) return;
    sendMutation.mutate({ text: input });
    setInput("");
  };

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !selectedPeer) return;
    try {
      assertFileAllowed(file);
    } catch (err) {
      alert((err as Error).message);
      return;
    }
    sendMutation.mutate({ text: input, file });
    setInput("");
  };

  const stopRecording = () => {
    if (recording && recording.state !== "inactive") {
      recording.stop();
    }
    setRecording(null);
  };

  const startRecording = async () => {
    if (!selectedPeer) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream, { mimeType: "audio/webm" });
      const chunks: Blob[] = [];
      rec.ondataavailable = (ev) => {
        if (ev.data.size) chunks.push(ev.data);
      };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: "audio/webm" });
        const file = new File([blob], "recording.webm", { type: "audio/webm" });
        try {
          assertFileAllowed(file);
          sendMutation.mutate({ text: input, file });
        } catch (err) {
          alert((err as Error).message);
        }
        setInput("");
      };
      rec.start();
      setRecording(rec);
    } catch {
      alert("Microphone permission is required to record audio.");
    }
  };

  const isOnline = (id: string) => onlineUsers.some((u) => u.id === id);

  const messages = messagesQuery.data ?? [];
  const mobileThreadOpen = Boolean(selectedPeer);

  const topMessageAlert = messageAlerts[0];
  const moreAlertCount = messageAlerts.length > 1 ? messageAlerts.length - 1 : 0;

  const consumeTopMessageAlert = () => {
    setMessageAlerts((a) => a.slice(1));
  };

  const openTopMessageAlert = () => {
    const alert = messageAlerts[0];
    if (!alert) return;
    const inboxHit = inboxPeers.find((p) => p.peer.id === alert.fromId);
    const contactHit = contacts.find((c) => c.id === alert.fromId);
    const peer: UserPublic =
      inboxHit?.peer ??
      contactHit ?? {
        id: alert.fromId,
        _id: alert.fromId,
        username: alert.sender,
        profilePic: "",
        avatarUrl: null,
      };
    setSelectedPeer(peer);
    setSelectedConversationId(inboxHit?.conversation.id ?? null);
    setSidebarTab("chats");
    consumeTopMessageAlert();
  };

  useEffect(() => {
    if (!topMessageAlert) return;
    const t = window.setTimeout(() => {
      consumeTopMessageAlert();
    }, 4200);
    return () => clearTimeout(t);
  }, [topMessageAlert?.id]);

  if (!user) {
    return (
      <div className="chat-terminal flex min-h-screen items-center justify-center bg-[var(--t-bg)] p-6 font-mono text-[var(--t-primary)]">
        <p className="text-sm text-[var(--t-muted)]">Loading session…</p>
      </div>
    );
  }

  return (
    <div className="chat-terminal flex h-screen max-h-screen overflow-hidden bg-[var(--t-bg)] font-mono text-[var(--t-primary)]">
      <aside
        className={`${mobileThreadOpen ? "hidden" : "flex"} w-full min-h-0 shrink-0 flex-col border-b border-[var(--t-border)] md:flex md:h-screen md:w-[280px] md:border-b-0 md:border-r`}
      >
        <header className="flex items-start gap-2 border-b border-[var(--t-border)] px-3 py-3">
          <button
            type="button"
            onClick={() => avatarInputRef.current?.click()}
            className="relative flex h-10 w-10 shrink-0 items-center justify-center border border-[var(--t-border)] bg-[var(--t-bg)] text-[10px] text-[var(--t-secondary)]"
            title="Change avatar"
          >
            {avatarSrc(user) ? (
              <img src={avatarSrc(user)!} alt="" className="h-full w-full object-cover" />
            ) : (
              <span>{user.username.slice(0, 2).toUpperCase()}</span>
            )}
            {avatarMutation.isPending ? (
              <span className="absolute inset-0 flex items-center justify-center bg-black/50">
                <Loader2 className="h-4 w-4 animate-spin text-[var(--t-primary)]" />
              </span>
            ) : null}
          </button>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) avatarMutation.mutate(f);
            }}
          />
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="truncate text-sm">{user.username}</p>
            <p className="text-xs text-[var(--t-muted)]">
              <span className="text-[var(--t-online)]">[+] </span>
              {isOnline(user.id) ? "Online" : "Offline"}
            </p>
          </div>
          <ThemeToggle />
        </header>

        <nav className="flex flex-wrap gap-1 border-b border-[var(--t-border)] px-2 py-2" aria-label="Inbox sections">
          {(
            [
              ["chats", "[ Chats ]", chatsUnreadThreads],
              ["people", "People", incomingRequestCount],
              ["archived", "Archived", archivedUnreadThreads],
            ] as const
          ).map(([key, label, count]) => (
            <button
              key={key}
              type="button"
              onClick={() => setSidebarTab(key)}
              className={`inline-flex items-center gap-1 px-2 py-1 text-xs ${
                sidebarTab === key
                  ? "border border-[var(--t-border)] bg-[var(--t-bg)] text-[var(--t-primary)]"
                  : "text-[var(--t-secondary)] hover:text-[var(--t-primary)]"
              }`}
            >
              {label}
              {count > 0 ? (
                <span className="min-w-[1.1rem] border border-[var(--t-border)] px-1 text-[10px] leading-4 text-[var(--t-primary)]">
                  {count}
                </span>
              ) : null}
            </button>
          ))}
        </nav>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {sidebarTab === "chats" ? (
            <>
              {inboxQuery.isLoading ? (
                <p className="p-3 text-sm text-[var(--t-muted)]">Loading conversations…</p>
              ) : inboxQuery.isError ? (
                <p className="p-3 text-sm text-[var(--t-danger)]">Could not load inbox.</p>
              ) : inboxPeers.length === 0 ? (
                <p className="p-3 text-sm text-[var(--t-muted)]">
                  No conversations yet. In People, send a request and wait until they accept — then open a thread here.
                </p>
              ) : (
                <ul className="list-none p-0">
                  {inboxPeers.map(({ conversation, peer }) => {
                    const active = selectedPeer?.id === peer.id;
                    const last = conversation.lastMessage;
                    const preview = last?.text || last?.body || "";
                    return (
                      <SwipeRow
                        key={conversation.id}
                        onArchive={() => archiveMutation.mutate(conversation.id)}
                        onSecondAction={() => archiveMutation.mutate(conversation.id)}
                        disabled={archiveMutation.isPending}
                        secondLabel="Archive"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPeer(peer);
                            setSelectedConversationId(conversation.id);
                          }}
                          className={`flex w-full items-start gap-2 px-3 py-2.5 text-left ${
                            active ? "border-l-2 border-[var(--t-primary)] bg-[var(--t-bg)]" : "hover:bg-[var(--t-bg)]"
                          } `}
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-[var(--t-border)] bg-[var(--t-input)] text-[10px] text-[var(--t-secondary)]">
                            {avatarSrc(peer) ? (
                              <img src={avatarSrc(peer)!} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <span>{peer.username.slice(0, 1).toLowerCase()}</span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate text-sm">{peer.username}</span>
                              <span className={isOnline(peer.id) ? "text-[var(--t-online)]" : "text-[var(--t-muted)]"}>
                                {isOnline(peer.id) ? "[+]" : "[~]"}
                              </span>
                            </div>
                            <p className="truncate text-xs text-[var(--t-muted)]">
                              &gt; last: {preview || "—"}
                            </p>
                          </div>
                          {conversation.unreadCount > 0 ? (
                            <span className="shrink-0 border border-[var(--t-border)] px-1.5 text-[10px] text-[var(--t-primary)]">
                              {conversation.unreadCount}
                            </span>
                          ) : null}
                          <span className="shrink-0 text-[11px] text-[var(--t-muted)]">[A]</span>
                        </button>
                      </SwipeRow>
                    );
                  })}
                </ul>
              )}
            </>
          ) : null}

          {sidebarTab === "people" ? (
            <>
              {usersQuery.isLoading || incomingRequestsQuery.isLoading || outgoingRequestsQuery.isLoading ? (
                <p className="p-3 text-sm text-[var(--t-muted)]">Loading people…</p>
              ) : usersQuery.isError || incomingRequestsQuery.isError || outgoingRequestsQuery.isError ? (
                <p className="p-3 text-sm text-[var(--t-danger)]">Could not load people or requests.</p>
              ) : (
                <>
                  <div className="border-b border-[var(--t-border)] p-3">
                    <p className="mb-2 text-[11px] font-normal text-[var(--t-muted)]">
                      &gt; requests — accept to connect (both of you can chat)
                    </p>
                    {(incomingRequestsQuery.data ?? []).length === 0 ? (
                      <p className="text-xs text-[var(--t-muted)]">No incoming requests.</p>
                    ) : (
                      <ul className="mt-2 space-y-2">
                        {(incomingRequestsQuery.data ?? []).map((req) => {
                          const peer = req.from!;
                          return (
                            <li
                              key={req.id}
                              className="flex flex-wrap items-center gap-2 border border-[var(--t-border)] bg-[var(--t-bg)] px-2 py-2"
                            >
                              <span className="min-w-0 flex-1 truncate text-sm">@{peer.username}</span>
                              <button
                                type="button"
                                className="border border-[var(--t-border)] bg-[var(--t-input)] px-2 py-1 text-xs text-[var(--t-primary)] disabled:opacity-50"
                                disabled={acceptRequestMutation.isPending || rejectRequestMutation.isPending}
                                onClick={() => acceptRequestMutation.mutate(req.id)}
                              >
                                [Accept]
                              </button>
                              <button
                                type="button"
                                className="border border-[var(--t-border)] px-2 py-1 text-xs text-[var(--t-muted)] disabled:opacity-50"
                                disabled={acceptRequestMutation.isPending || rejectRequestMutation.isPending}
                                onClick={() => rejectRequestMutation.mutate(req.id)}
                              >
                                [Decline]
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>

                  <div className="border-b border-[var(--t-border)] p-3">
                    <p className="mb-2 text-[11px] text-[var(--t-muted)]">&gt; waiting on them</p>
                    {(outgoingRequestsQuery.data ?? []).length === 0 ? (
                      <p className="text-xs text-[var(--t-muted)]">No outgoing requests.</p>
                    ) : (
                      <ul className="mt-2 space-y-2">
                        {(outgoingRequestsQuery.data ?? []).map((req) => {
                          const peer = req.to!;
                          return (
                            <li
                              key={req.id}
                              className="flex flex-wrap items-center gap-2 border border-[var(--t-border)] bg-[var(--t-bg)] px-2 py-2"
                            >
                              <span className="min-w-0 flex-1 truncate text-sm text-[var(--t-secondary)]">
                                @{peer.username} <span className="text-[var(--t-muted)]">… pending</span>
                              </span>
                              <button
                                type="button"
                                className="border border-[var(--t-border)] px-2 py-1 text-xs text-[var(--t-muted)] disabled:opacity-50"
                                disabled={cancelRequestMutation.isPending}
                                onClick={() => cancelRequestMutation.mutate(req.id)}
                              >
                                [Cancel]
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>

                  <div className="border-b border-[var(--t-border)] p-3">
                    <p className="mb-2 text-[11px] text-[var(--t-muted)]">&gt; send request by username</p>
                    <form
                      className="flex gap-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        const u = addContactUsername.trim();
                        if (!u || addContactMutation.isPending) return;
                        addContactMutation.mutate(u);
                      }}
                    >
                      <input
                        value={addContactUsername}
                        onChange={(e) => setAddContactUsername(e.target.value)}
                        placeholder="username"
                        autoComplete="off"
                        className="min-w-0 flex-1 border border-[var(--t-border)] bg-[var(--t-input)] px-2 py-1.5 font-mono text-sm text-[var(--t-primary)] placeholder:text-[var(--t-muted)] focus:border-[var(--t-muted)] focus:outline-none"
                      />
                      <button
                        type="submit"
                        disabled={addContactMutation.isPending || !addContactUsername.trim()}
                        className="shrink-0 border border-[var(--t-border)] bg-[var(--t-sidebar)] px-3 py-1.5 font-mono text-xs text-[var(--t-primary)] hover:border-[var(--t-muted)] disabled:opacity-50"
                        title="Send contact request"
                      >
                        [→]
                      </button>
                    </form>
                    {addContactMutation.isError ? (
                      <p className="mt-2 text-xs text-[var(--t-danger)]">
                        {(addContactMutation.error as Error).message}
                      </p>
                    ) : null}
                  </div>

                  <div className="p-3 pb-0">
                    <p className="text-[11px] text-[var(--t-muted)]">&gt; your connections</p>
                  </div>
                  {contacts.length === 0 ? (
                    <p className="p-3 text-sm text-[var(--t-muted)]">
                      No mutual connections yet. Accept a request above, or send one — if they already sent you one, yours
                      connects you instantly.
                    </p>
                  ) : peopleWithoutChat.length === 0 ? (
                    <p className="p-3 text-sm text-[var(--t-muted)]">
                      Everyone you are connected with is already in your Chats list.
                    </p>
                  ) : (
                    <ul className="space-y-0">
                      {peopleWithoutChat.map((peer) => (
                        <li key={peer.id} className="flex border-b border-[var(--t-border)]">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPeer(peer);
                              setSelectedConversationId(null);
                            }}
                            className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2.5 text-left hover:bg-[var(--t-bg)]"
                          >
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-[var(--t-border)] bg-[var(--t-input)] text-[10px]">
                              {avatarSrc(peer) ? (
                                <img src={avatarSrc(peer)!} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <span>{peer.username.slice(0, 1).toLowerCase()}</span>
                              )}
                            </div>
                            <span className="min-w-0 flex-1 truncate text-sm">{peer.username}</span>
                            <span
                              className={
                                isOnline(peer.id) ? "shrink-0 text-[var(--t-online)]" : "shrink-0 text-[var(--t-muted)]"
                              }
                            >
                              {isOnline(peer.id) ? "[+]" : "[~]"}
                            </span>
                          </button>
                          <button
                            type="button"
                            title="Remove connection"
                            disabled={removeContactMutation.isPending}
                            className="shrink-0 border-l border-[var(--t-border)] px-2.5 font-mono text-xs text-[var(--t-muted)] hover:bg-[var(--t-bg)] hover:text-[var(--t-danger)] disabled:opacity-50"
                            onClick={() => removeContactMutation.mutate(peer.id)}
                          >
                            [−]
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </>
          ) : null}

          {sidebarTab === "archived" ? (
            <>
              {archivedQuery.isLoading ? (
                <p className="p-3 text-sm text-[var(--t-muted)]">Loading archived…</p>
              ) : archivedQuery.isError ? (
                <p className="p-3 text-sm text-[var(--t-danger)]">Could not load archived threads.</p>
              ) : (archivedQuery.data ?? []).length === 0 ? (
                <p className="p-3 text-sm text-[var(--t-muted)]">No archived conversations.</p>
              ) : (
                <ul className="space-y-1 p-2">
                  {(archivedQuery.data ?? []).map((row) => (
                    <li
                      key={row.id}
                      className="flex items-center justify-between gap-2 border border-[var(--t-border)] px-2 py-2"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-xs text-[var(--t-muted)]">
                          #<span className="font-mono">{row.id.slice(0, 8)}…</span>
                        </span>
                        {row.unreadCount > 0 ? (
                          <span className="shrink-0 border border-[var(--t-border)] px-1.5 text-[10px] text-[var(--t-primary)]">
                            {row.unreadCount}
                          </span>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        className="border border-[var(--t-border)] bg-[var(--t-input)] px-2 py-1 text-xs text-[var(--t-primary)]"
                        onClick={() => restoreMutation.mutate(row.id)}
                        disabled={restoreMutation.isPending}
                        title="Restore"
                      >
                        [R]
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : null}
        </div>

        <footer className="shrink-0 border-t border-[var(--t-border)] p-3">
          <button
            type="button"
            className="w-full border border-[var(--t-border)] py-2.5 text-sm text-[#e8e8e0]"
            style={{ background: "var(--t-danger)" }}
            title="Log out"
            onClick={() => {
              localStorage.clear();
              navigate("/login", { replace: true });
            }}
          >
            | Log out |
          </button>
        </footer>
      </aside>

      <main className={`${mobileThreadOpen ? "flex" : "hidden"} min-h-0 flex-1 flex-col md:flex md:min-h-screen`}>
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--t-border)] bg-[var(--t-sidebar)] px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            {selectedPeer ? (
              <button
                type="button"
                className="border border-[var(--t-border)] px-3 py-1.5 text-base leading-none md:hidden"
                onClick={() => {
                  setSelectedPeer(null);
                  setSelectedConversationId(null);
                }}
                title="Back"
              >
                [←]
              </button>
            ) : null}
            {selectedPeer ? (
              <h1 className="truncate text-sm font-normal">
                <strong># {selectedPeer.username}</strong> — direct
              </h1>
            ) : (
              <h1 className="text-sm font-normal text-[var(--t-muted)]">Select a conversation</h1>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {selectedConversationId ? (
              <button
                type="button"
                title="Archive"
                className="border border-[var(--t-border)] px-2 py-1 font-mono text-xs"
                onClick={() => archiveMutation.mutate(selectedConversationId)}
                disabled={archiveMutation.isPending}
              >
                [A]
              </button>
            ) : null}
          </div>
        </header>

        <div
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
          tabIndex={0}
          onFocus={emitMarkRead}
          role="region"
          aria-label="Chat messages"
        >
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
            {!selectedPeer ? (
              <p className="text-center text-sm text-[var(--t-muted)]">Pick someone from the sidebar to start chatting.</p>
            ) : messagesQuery.isLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-[var(--t-muted)]" />
              </div>
            ) : messagesQuery.isError ? (
              <p className="text-center text-sm text-[var(--t-danger)]">Failed to load messages.</p>
            ) : messages.length === 0 ? (
              <p className="text-center text-sm text-[var(--t-muted)]">No messages yet. Say hello.</p>
            ) : (
              messages.map((msg) => {
                const mine = String(msg.from) === String(userId);
                const time =
                  msg.timestamp && !Number.isNaN(new Date(msg.timestamp).getTime())
                    ? format(new Date(msg.timestamp), "HH:mm")
                    : "";
                return (
                  <div
                    key={msg._id}
                    className={`relative flex w-full ${mine ? "justify-end" : "justify-start"}`}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      if (mine) setMenuForMessageId(msg._id);
                    }}
                  >
                    <div
                      className={`max-w-[min(100%,28rem)] border border-[var(--t-border)] px-3 py-2 text-sm break-words ${
                        mine ? "bg-[var(--t-msg-self)]" : "bg-[var(--t-msg-other)]"
                      } `}
                    >
                      {!mine ? (
                        <p className="mb-1 text-[11px] text-[var(--t-muted)]">{msg.sender}</p>
                      ) : null}
                      {msg.text ? <p className="whitespace-pre-wrap">{msg.text}</p> : null}
                      <MessageMedia message={msg} fromMe={mine} />
                      <div
                        className={`mt-2 flex flex-wrap gap-2 text-[11px] text-[var(--t-muted)] ${
                          mine ? "justify-end" : "justify-start"
                        }`}
                      >
                        {mine ? (
                          <span>{formatReceipt(msg)}</span>
                        ) : time ? (
                          <span>{time}</span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            {selectedPeer && !messagesQuery.isLoading && !messagesQuery.isError ? (
              <div ref={scrollRef} className="h-px w-full shrink-0 scroll-mt-4" aria-hidden />
            ) : null}
          </div>

          <div
            className="relative z-10 flex min-h-[1.2rem] shrink-0 items-end justify-start bg-[var(--t-sidebar)] px-4"
            aria-live="polite"
          >
            {peerIsTyping ? (
              <div className="typing-indicator">
                <span className="typing-label">[ writing ]</span>
                <span className="typing-cursor"> █</span>
              </div>
            ) : null}
          </div>

          {menuForMessageId ? (
            <div className="fixed inset-0 z-40 flex flex-col justify-end bg-black/40" role="dialog">
              <button
                type="button"
                className="absolute inset-0 cursor-default"
                aria-label="Dismiss"
                onClick={() => setMenuForMessageId(null)}
              />
              <div className="relative z-10 mx-auto mb-6 w-full max-w-sm border border-[var(--t-border)] bg-[var(--t-sidebar)] p-4 font-mono shadow-lg">
                <p className="mb-3 text-sm text-[var(--t-secondary)]">delete? [y] [n]</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="flex-1 border border-[var(--t-border)] py-2 text-sm"
                    onClick={() => setMenuForMessageId(null)}
                  >
                    [n]
                  </button>
                  <button
                    type="button"
                    className="flex-1 border border-[var(--t-danger)] py-2 text-sm text-[var(--t-danger)]"
                    onClick={() => {
                      if (menuForMessageId) deleteMutation.mutate(menuForMessageId);
                      setMenuForMessageId(null);
                    }}
                  >
                    [y]
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          <form
            onSubmit={handleSend}
            className="chat-input-bar shrink-0 flex-wrap border-t border-[var(--t-border)] bg-[var(--t-sidebar)]"
          >
            <div className="min-w-0 flex-1">
              <ComposeInput
                value={input}
                onChange={setInput}
                placeholder={selectedPeer ? `Message @${selectedPeer.username}` : "Select a chat"}
                disabled={!selectedPeer || sendMutation.isPending}
                fileInputRef={fileInputRef}
                onPickFile={onPickFile}
              />
            </div>
            {!recording ? (
              <button
                type="button"
                className="flex shrink-0 items-center justify-center border border-[var(--t-border)] px-2.5 py-2 text-[var(--t-secondary)] hover:text-[var(--t-primary)] disabled:opacity-50"
                onClick={() => void startRecording()}
                disabled={!selectedPeer || sendMutation.isPending}
                title="Record audio"
              >
                <span className="sr-only">Record audio</span>
                <Mic className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              </button>
            ) : (
              <button
                type="button"
                className="flex shrink-0 items-center justify-center border border-[var(--t-danger)] px-2.5 py-2 text-[var(--t-danger)]"
                onClick={stopRecording}
                title="Stop recording"
              >
                <span className="sr-only">Stop recording</span>
                <Square className="h-4 w-4 fill-current" aria-hidden />
              </button>
            )}
            <button
              type="submit"
              className="shrink-0 border border-[var(--t-border)] bg-[var(--t-input)] px-4 py-2 text-sm font-normal disabled:opacity-50"
              disabled={!selectedPeer || sendMutation.isPending || Boolean(recording) || !input.trim()}
            >
              {sendMutation.isPending ? "…" : "Send"}
            </button>
          </form>
        </div>
      </main>

      {topMessageAlert ? (
        <div className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex justify-center px-3">
          <button
            type="button"
            className="pointer-events-auto w-full max-w-md border border-[var(--t-border)] bg-[var(--t-sidebar)] px-4 py-3 text-left font-mono shadow-lg"
            onClick={openTopMessageAlert}
            title="Open chat"
          >
            <p id="in-app-msg-alert-title" className="text-[11px] text-[var(--t-muted)]">
              &gt; new message
            </p>
            <p className="mt-1 text-sm text-[var(--t-primary)]">
              <span className="text-[var(--t-secondary)]">@</span>
              {topMessageAlert.sender}
            </p>
            <p className="mt-1 truncate text-xs text-[var(--t-secondary)]">{topMessageAlert.preview}</p>
            {moreAlertCount > 0 ? (
              <p className="mt-1 text-[10px] text-[var(--t-muted)]">+{moreAlertCount} more</p>
            ) : null}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default Chat;
