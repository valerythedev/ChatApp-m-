import { Navigate, Route, Routes } from "react-router-dom";
import Chat from "@/pages/Chat";
import Landing from "@/pages/Landing";
import { Login } from "@/pages/Login";
import { Signup } from "@/pages/Signup";

function App() {
  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;
