// src/pages/Signup.jsx
import { useNavigate } from "react-router-dom";
import SignupForm from "../components/signupForm.jsx";
import { signupAndLogin } from "../Services/authService.js";

function Signup() {
  const navigate = useNavigate();

  const handleSignup = async (formData) => {
    try {
      await signupAndLogin(formData);
      navigate("/chat");
    } catch (error) {
      console.error("❌ Signup failed:", error.message);
      alert(error.message || "Signup failed");
    }
  };

  return <SignupForm onSubmit={handleSignup} />;
}

export default Signup;
