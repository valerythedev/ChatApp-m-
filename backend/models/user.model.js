import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true, 
    },
    username: {
      type: String, 
      required: true, 
      unique: true, 
    },
    password: {
      type: String, 
      required: true,
      minlength: 8
    }, 
    age: {
      required: true, 
      type: Number, 
      min: [16, "Must be at least 16 years old"]
    },
    profilePic: {
      type: String, 
      default: ""
    }
  },
  {
    timestamps: true
  }
);

const User = mongoose.model("User", userSchema);
export default User;
