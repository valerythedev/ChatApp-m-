import { prisma } from "./prisma.js";

export async function isContact(ownerId: string, contactId: string): Promise<boolean> {
  const row = await prisma.userContact.findUnique({
    where: { ownerId_contactId: { ownerId, contactId } },
    select: { ownerId: true },
  });
  return Boolean(row);
}

/** Both users must have each other on their list (two UserContact rows). */
export async function isMutualContact(aId: string, bId: string): Promise<boolean> {
  const [ab, ba] = await Promise.all([
    prisma.userContact.findUnique({
      where: { ownerId_contactId: { ownerId: aId, contactId: bId } },
      select: { ownerId: true },
    }),
    prisma.userContact.findUnique({
      where: { ownerId_contactId: { ownerId: bId, contactId: aId } },
      select: { ownerId: true },
    }),
  ]);
  return Boolean(ab && ba);
}

export async function createMutualContacts(userA: string, userB: string): Promise<void> {
  await prisma.$transaction([
    prisma.userContact.upsert({
      where: { ownerId_contactId: { ownerId: userA, contactId: userB } },
      create: { ownerId: userA, contactId: userB },
      update: {},
    }),
    prisma.userContact.upsert({
      where: { ownerId_contactId: { ownerId: userB, contactId: userA } },
      create: { ownerId: userB, contactId: userA },
      update: {},
    }),
  ]);
}

export async function canSendDirectMessage(senderId: string, receiverId: string): Promise<boolean> {
  return isMutualContact(senderId, receiverId);
}

export async function listMutualContactIds(userId: string): Promise<string[]> {
  const owned = await prisma.userContact.findMany({
    where: { ownerId: userId },
    select: { contactId: true },
  });
  const out: string[] = [];
  for (const { contactId } of owned) {
    if (await isMutualContact(userId, contactId)) out.push(contactId);
  }
  return out;
}
