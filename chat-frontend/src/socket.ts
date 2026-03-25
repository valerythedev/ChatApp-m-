import { io, type Socket } from "socket.io-client";
import { appConfig } from "@/config";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(appConfig.socketOrigin, { withCredentials: true, autoConnect: true });
  }
  return socket;
}
