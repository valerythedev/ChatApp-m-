import { Routes, Route } from "react-router-dom";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import Chat from "./pages/Chat";
import './index.css';

function App() {

  return (
    
    <div className="bg-black text-green-400 font-mono min-h-screen p-4">
      <Routes>
          <Route path="/signup" element={<Signup />} />
        <Route path="/" element={<Login />} />
          <Route path="/chat" element={<Chat />} />
      </Routes>
    </div>
  );
}

export default App;
