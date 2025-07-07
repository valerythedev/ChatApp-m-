import { useEffect, useState } from "react";
import axios from "axios";

function UserList({ onSelect, selectedUserId, onlineUsers = [] }) {
  const [users, setUsers] = useState([]);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("http://localhost:5550/api/auth/users", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUsers(res.data);
      } catch (err) {
        console.error("❌ Error fetching users:", err.response?.data || err.message);
      }
    };

    fetchUsers();
  }, []);

  const handleLogout = () => {
    setLoggingOut(true);
    setTimeout(() => {
      localStorage.clear();
      window.location.href = "/";
    }, 300);
  };

  const isOnline = (userId) => {
    return onlineUsers.some((u) => u.id === userId || u._id === userId);
  };

  return (
    <aside className="flex">
      {/* Left logo bar */}
      <div className="flex flex-col items-center w-16 h-screen py-6 space-y-8 bg-white dark:bg-zinc-900 dark:border-zinc-700 border-r">
        <a href="#">
          <img className="w-auto h-6" src="/ChatBx.svg" alt="Logo" />
        </a>
      </div>

      {/* Right user list + logout */}
      <div className="h-screen py-6 overflow-y-auto bg-white dark:bg-zinc-900 dark:border-zinc-700 border-r w-60 sm:w-64 flex flex-col justify-between">
        <div>
          <h2 className="px-5 text-lg font-medium text-zinc-800 dark:text-white">Users</h2>

          <div className="mt-6 space-y-2 px-2">
            {users.map((user) => {
              const isSelected = user._id === selectedUserId;
              const online = isOnline(user._id);

              return (
                <button
                  key={user._id}
                  onClick={() => onSelect(user)}
                  className={`flex items-center w-full px-3 py-2 gap-x-2 rounded transition-colors ${
                    isSelected
                      ? "bg-zinc-200 dark:bg-zinc-800"
                      : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  }`}
                >
                  {user.profilePic ? (
                    <img
                      className="object-cover w-8 h-8 rounded-full"
                      src={user.profilePic}
                      alt={user.username}
                    />
                  ) : (
                    <div className="object-cover w-8 h-8 rounded-full bg-zinc-600 flex items-center justify-center text-sm text-white">
                      {user.username.slice(0, 2).toUpperCase()}
                    </div>
                  )}

                  <div className="text-left">
                    <h1 className="text-sm font-medium text-zinc-700 capitalize dark:text-white">
                      {user.username}
                    </h1>
                    <p className={`text-xs ${online ? "text-green-500" : "text-zinc-500"} dark:text-zinc-400`}>
                      {online ? "Online" : "Offline"}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 🔘 Logout Toggle */}
        <div className="px-5 mt-4 mb-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-600 dark:text-zinc-300">Logout</span>
            <button
              onClick={handleLogout}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                loggingOut ? "bg-red-600" : "bg-zinc-500"
              }`}
            >
              <span className="sr-only">Toggle Logout</span>
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  loggingOut ? "translate-x-5" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default UserList;
