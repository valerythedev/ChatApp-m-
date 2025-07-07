import { useState, useEffect } from "react";
import axios from "axios";

function ChatTerminal() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const token = localStorage.getItem("token"); // Asumiendo que ya tienes login

  const fetchMessages = async () => {
    try {
      const res = await axios.get("http://localhost:5550/api/msg/inbox", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const last = res.data[0]?.lastMessage;
      setMessages(prev => [...prev, last]);
    } catch (error) {
      console.error("❌ Error fetching inbox:", error);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const receiverId = "6859690a9ba2ce7a0e822261"; // Rosamelo ID

    try {
      const res = await axios.post(
        "http://localhost:5550/api/msg/send",
        {
          text: input,
          receiverId,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setMessages(prev => [...prev, res.data.data]);
      setInput("");
    } catch (error) {
      console.error("❌ Error sending message:", error);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        {messages.map((msg, idx) => (
          <p key={idx}>[user@chat]$ {msg?.text}</p>
        ))}
      </div>
      <form onSubmit={handleSend}>
        <input
          type="text"
          className="bg-black border-none outline-none text-green-400 w-full"
          placeholder="> Type your message"
          value={input}
          onChange={e => setInput(e.target.value)}
        />
      </form>
    </div>
  );
}

export default ChatTerminal;
