import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const res = await axios.post("http://localhost:5550/api/auth/login", {
        username,
        password,
      });
      console.log("🧠 res.data.user:", res.data.user);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      localStorage.setItem("token", res.data.token);

      setTimeout(() => {
        navigate("/chat");
      }, 100);
    } catch (error) {
      console.error("❌ Login error:", error.response?.data || error.message);
      alert("Login failed. Check username and password.");
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto overflow-hidden bg-white rounded-lg shadow-md dark:bg-zinc-800">
      <div className="px-6 py-4">
        <div className="flex justify-center mx-auto">
          <img
            className="w-auto h-10"
            src="/ChatBx.svg"
            alt="ChatBox Logo"
          />
        </div>

        <h3 className="mt-3 text-xl font-medium text-center text-zinc-600 dark:text-zinc-200">Welcome Back</h3>
        <p className="mt-1 text-center text-zinc-500 dark:text-zinc-400">Login or create account</p>

        {/* ✅ Form connected to handleLogin */}
        <form onSubmit={handleLogin}>
          <div className="w-full mt-4">
            <input
              type="text"
              name="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              aria-label="Username"
              className="block w-full px-4 py-2 mt-2 text-zinc-700 placeholder-zinc-500 bg-white border rounded-lg dark:bg-zinc-800 dark:border-zinc-600 dark:placeholder-zinc-400 focus:border-blue-400 dark:focus:border-blue-300 focus:ring-opacity-40 focus:outline-none focus:ring focus:ring-blue-300"
            />
          </div>

          <div className="w-full mt-4">
            <input
              type="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              aria-label="Password"
              className="block w-full px-4 py-2 mt-2 text-zinc-700 placeholder-zinc-500 bg-white border rounded-lg dark:bg-zinc-800 dark:border-zinc-600 dark:placeholder-zinc-400 focus:border-blue-400 dark:focus:border-blue-300 focus:ring-opacity-40 focus:outline-none focus:ring focus:ring-blue-300"
            />
          </div>

          <div className="flex items-center justify-between mt-4">
            <a href="#" className="text-sm text-zinc-600 dark:text-zinc-200 hover:text-zinc-500">Forget Password?</a>
            <button
              type="submit"
              className="px-6 py-2 text-sm font-medium tracking-wide text-white capitalize transition-colors duration-300 transform bg-blue-500 rounded-lg hover:bg-blue-400 focus:outline-none focus:ring focus:ring-blue-300 focus:ring-opacity-50"
            >
              Sign In
            </button>
          </div>
        </form>
      </div>

      <div className="flex items-center justify-center py-4 text-center bg-zinc-50 dark:bg-zinc-700">
        <span className="text-sm text-zinc-600 dark:text-zinc-200">Don't have an account? </span>
        <a href="/signup" className="mx-2 text-sm font-bold text-blue-500 dark:text-blue-400 hover:underline">Register</a>
      </div>
    </div>
  );
}

export default Login;
