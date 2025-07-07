import { useEffect, useRef, useState } from "react";
import axios from "axios";
import socket from "../socket";
import UserList from "../components/UserList";
import { format } from "date-fns";

function Chat() {
  const [user, setUser] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [allMessages, setAllMessages] = useState({});
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef(null);
  const [onlineUsers, setOnlineUsers] = useState([]);

  const userId = String(user?.id || user?._id);
  const messages = allMessages[selectedUser?._id] || [];

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        console.log("✅ User from localStorage:", parsed);
        setUser({ ...parsed, id: parsed.id || parsed._id });
        socket.emit("join", parsed);
      } catch (err) {
        console.error("❌ Error parsing user:", err);
      }
    }
  }, []);

  useEffect(() => {
    socket.on("users", (usersOnline) => {
      setOnlineUsers(usersOnline);
    });

    return () => {
      socket.off("users");
    };
  }, []);

  useEffect(() => {
    if (!user) return;

    const handleReceive = (msg) => {
      const from = String(msg.from) === userId ? msg.to : msg.from;
      setAllMessages((prev) => ({
        ...prev,
        [from]: [...(prev[from] || []), msg],
      }));
    };

    const handleTyping = (who) => {
      if (who?.username !== user.username) {
        setIsTyping(`${who.username} is typing...`);
        setTimeout(() => setIsTyping(false), 3000);
      }
    };

    socket.on("receiveMessage", handleReceive);
    socket.on("typing", handleTyping);

    return () => {
      socket.off("receiveMessage", handleReceive);
      socket.off("typing", handleTyping);
    };
  }, [user, userId]);

  useEffect(() => {
    if (input && selectedUser) {
      socket.emit("typing", selectedUser._id);
    }
  }, [input, selectedUser]);

  useEffect(() => {
    if (user && selectedUser) {
      socket.emit("markAsRead", {
        from: selectedUser._id,
        to: userId,
      });
    }
  }, [selectedUser, userId]);

  useEffect(() => {
    const handleRead = ({ from }) => {
      setAllMessages((prev) => {
        const updated = (prev[from] || []).map((msg) =>
          msg.to === userId ? { ...msg, isRead: true } : msg
        );
        return { ...prev, [from]: updated };
      });
    };

    socket.on("messagesRead", handleRead);

    return () => {
      socket.off("messagesRead", handleRead);
    };
  }, [userId]);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!user || !selectedUser) return;

      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`http://localhost:5550/api/msg/${selectedUser._id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setAllMessages((prev) => ({
          ...prev,
          [selectedUser._id]: res.data,
        }));
      } catch (err) {
        console.error("❌ Error fetching history:", err);
      }
    };

    fetchHistory();
  }, [selectedUser, user]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim() || !user || !selectedUser) return;

    const msg = {
      text: input,
      from: userId,
      to: selectedUser._id,
      sender: user.username,
      receiver: selectedUser.username,
      timestamp: new Date().toISOString(),
    };

    socket.emit("privateMessage", msg);

    setAllMessages((prev) => ({
      ...prev,
      [selectedUser._id]: [
        ...(prev[selectedUser._id] || []),
        { ...msg, isRead: false },
      ],
    }));

    setInput("");
  };

  return (
    <div className="flex min-h-screen bg-white text-black dark:bg-zinc-900 dark:text-white font-sans">
      <UserList
        selectedUserId={selectedUser?._id}
        onSelect={(u) => setSelectedUser(u)}
        onlineUsers={onlineUsers}
      />

      <div className="flex-1 flex flex-col p-4">
        <div className="mb-4 border-b pb-2">
          {selectedUser ? (
            <div className="flex items-center gap-3">
              <img
                src={selectedUser.profilePic || selectedUser.avatar || "/default-avatar.png"}
                alt={selectedUser.username}
                className="w-10 h-10 rounded-full border border-white object-cover"
              />
              <h2 className="text-lg font-bold">{selectedUser.username}</h2>
            </div>
          ) : (
            <h2 className="text-lg font-bold">📨 Select a user to chat</h2>
          )}
        </div>

        <div className="border border-gray-700 rounded p-4 h-[400px] overflow-y-auto bg-neutral-800/80 mb-4 flex flex-col">
          {messages.map((msg, i) => {
            const isMine = String(msg.from) === String(userId);
            const time =
              msg.timestamp && !isNaN(new Date(msg.timestamp).getTime())
                ? format(new Date(msg.timestamp), "hh:mm a")
                : "";

            return (
              <div
                key={i}
                ref={i === messages.length - 1 ? scrollRef : null}
                className={`mb-3 flex flex-col ${isMine ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-xs px-4 py-2 rounded-2xl break-words text-sm ${
                    isMine
                      ? "bg-amber-900 text-white rounded-br-none"
                      : "bg-gray-100 text-black dark:bg-zinc-700 dark:text-white rounded-bl-none"
                  }`}
                >
                  {msg.text}
                </div>
                {time && (
                  <span className="text-xs text-gray-400 mt-1">
                    {time}
                    {isMine && i === messages.length - 1 && (
                      <span className="ml-2 text-green-400">
                        {msg.isRead ? "✓✓" : "✓"}
                      </span>
                    )}
                  </span>
                )}
              </div>
            );
          })}

          {isTyping && <p className="text-yellow-400 italic mt-2">{isTyping}</p>}
        </div>

        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            placeholder={
              selectedUser ? `Message @${selectedUser.username}` : "Select someone to chat"
            }
            className="flex-1 bg-zinc-100 border border-zinc-300 dark:bg-zinc-800 dark:border-zinc-600 px-3 py-2 rounded"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={!selectedUser}
          />
          <button
            type="submit"
            className="bg-sky-600 hover:bg-green-700 text-white px-4 py-2 rounded"
            disabled={!selectedUser}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}

export default Chat;
