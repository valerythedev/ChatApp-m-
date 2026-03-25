import type { Conversation } from "../generated/prisma/client.js";
import { prisma } from "./prisma.js";

export async function findOrCreateDmConversation(
  userIdA: string,
  userIdB: string
): Promise<Conversation> {
  if (userIdA === userIdB) {
    throw new Error("Cannot create conversation with self");
  }

  const aMemberships = await prisma.conversationUser.findMany({
    where: { userId: userIdA },
    select: { conversationId: true },
  });
  const convIds = aMemberships.map((m) => m.conversationId);

  const shared = await prisma.conversationUser.findMany({
    where: { userId: userIdB, conversationId: { in: convIds } },
    select: { conversationId: true },
  });

  for (const { conversationId } of shared) {
    const count = await prisma.conversationUser.count({ where: { conversationId } });
    if (count === 2) {
      const conv = await prisma.conversation.findFirst({
        where: { id: conversationId, isArchived: false },
      });
      if (conv) return conv;
    }
  }

  return prisma.$transaction(async (tx) => {
    const c = await tx.conversation.create({ data: {} });
    await tx.conversationUser.createMany({
      data: [
        { userId: userIdA, conversationId: c.id },
        { userId: userIdB, conversationId: c.id },
      ],
    });
    return c;
  });
}

export async function getDmConversation(
  userIdA: string,
  userIdB: string
): Promise<Conversation | null> {
  const aMemberships = await prisma.conversationUser.findMany({
    where: { userId: userIdA },
    select: { conversationId: true },
  });
  const convIds = aMemberships.map((m) => m.conversationId);
  const shared = await prisma.conversationUser.findMany({
    where: { userId: userIdB, conversationId: { in: convIds } },
    select: { conversationId: true },
  });
  for (const { conversationId } of shared) {
    const count = await prisma.conversationUser.count({ where: { conversationId } });
    if (count === 2) {
      return prisma.conversation.findFirst({
        where: { id: conversationId, isArchived: false },
      });
    }
  }
  return null;
}
