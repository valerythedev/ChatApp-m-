import User from "../models/user.model.js";

export const getAllUsers = async (req, res) => {
  try {
    const currentUserId = req.user.id;

    const users = await User.find({ _id: { $ne: currentUserId } }).select(
      "username fullName profilePic"
    );

    res.status(200).json(users);
  } catch (error) {
    console.error("getAllUsers error:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
};
