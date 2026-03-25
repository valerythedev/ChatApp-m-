import type { Server } from "socket.io";

let io: Server | null = null;

export function setIoInstance(server: Server): void {
  io = server;
}

export function getIoInstance(): Server | null {
  return io;
}
