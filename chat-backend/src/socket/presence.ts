const socketToUser = new Map<string, { id: string; username: string }>();

export function setSocketUser(socketId: string, user: { id: string; username: string }): void {
  socketToUser.set(socketId, user);
}

export function removeSocket(socketId: string): void {
  socketToUser.delete(socketId);
}

export function getUserBySocket(socketId: string): { id: string; username: string } | undefined {
  return socketToUser.get(socketId);
}

export function getSocketIdByUserId(userId: string): string | null {
  for (const [socketId, u] of socketToUser.entries()) {
    if (u.id === userId) return socketId;
  }
  return null;
}

export function listOnlineUsers(): Array<{ id: string; username: string; socketId: string }> {
  return Array.from(socketToUser.entries()).map(([socketId, u]) => ({ ...u, socketId }));
}
