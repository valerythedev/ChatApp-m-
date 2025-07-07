// src/socket.js
import { io } from "socket.io-client";

const socket = io("http://localhost:5550", {
  withCredentials: true,
});

export default socket;
