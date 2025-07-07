import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import generateToken from "../utils/generateToken.js";

console.log("📦 auth.controller.js CARGADO");

export const getAllUsers = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const users = await User.find({ _id: { $ne: currentUserId } }).select("username profilePic");
    res.status(200).json(users);
  } catch (error) {
    console.error("getAllUsers error:", error);
    res.status(500).json({ error: "Failed to fetch users." });
  }
};

export const signup = async (req, res) => {
    try {
        const { fullName, username, password, confirmPassword, age, profilePic } = req.body;

        if (!fullName || !username || !password || !confirmPassword || !age) {
            return res.status(400).json({ error: "All fields are required." });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ error: "Passwords do not match." });
        }

        if (age < 16) {
            return res.status(400).json({ error: "You must be at least 16 years old." });
        }

        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ error: "Username already taken." });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
// 🧠 Aquí generamos un avatar por defecto si no se provee
        const avatarUrl = `https://api.dicebear.com/8.x/adventurer/svg?seed=${username}`;

        const newUser = new User({
            fullName,
            username,
            password: hashedPassword,
            age,
            profilePic: profilePic || avatarUrl
        });

        await newUser.save();

        res.status(201).json({ message: "User registered successfully." });
    } catch (error) {
        console.error("Signup Error:", error);
        res.status(500).json({ error: "Something went wrong. Please try again." });
    }
};

export const login = async (req, res) => {
  console.log("🚪 Entró a login controlador");

  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required." });
    }

    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid password." });
    }

    // 🔐 Generar token
    const token = generateToken(user._id);

    res.status(200).json({
      message: "Login successful ✅",
      user: {
        id: user._id,
        fullName: user.fullName,
        username: user.username,
        profilePic: user.profilePic,
      },
      token
    });

  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ error: "Something went wrong during login." });
  }
};


export const logout= (req, res) => {
    console.log("Logout User")
    res.send("te fuiste")
} 