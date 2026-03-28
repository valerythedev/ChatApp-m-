import type { Request, Response } from "express";
import fs from "node:fs/promises";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";
import { isSupabaseStorageConfigured, uploadFile } from "../lib/supabase.js";
import { isMutualContact } from "../lib/contacts.js";
import generateToken from "../utils/generateToken.js";
import { toPublicUser } from "../lib/serialize.js";

function syntheticEmail(username: string): string {
  const safe = username.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${safe}@users.local`;
}

/** Mutual contacts only — `GET /api/auth/users`. */
export async function listContacts(req: Request, res: Response): Promise<void> {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }
    const rows = await prisma.userContact.findMany({
      where: { ownerId: currentUserId },
      include: {
        contact: { select: { id: true, username: true, avatarUrl: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    const mutual: typeof rows = [];
    for (const r of rows) {
      if (await isMutualContact(currentUserId, r.contactId)) {
        mutual.push(r);
      }
    }

    res.status(200).json(mutual.map((r) => toPublicUser(r.contact)));
  } catch (error) {
    console.error("listContacts error:", error);
    res.status(500).json({ error: "Failed to fetch contacts." });
  }
}

export async function sendContactRequest(req: Request, res: Response): Promise<void> {
  try {
    const ownerId = req.user?.id;
    if (!ownerId) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }
    const raw = (req.body as { username?: string }).username;
    const username = typeof raw === "string" ? raw.trim() : "";
    if (!username) {
      res.status(400).json({ error: "username is required." });
      return;
    }

    const target = await prisma.user.findUnique({
      where: { username },
      select: { id: true, username: true, avatarUrl: true },
    });
    if (!target) {
      res.status(404).json({ error: "User not found." });
      return;
    }
    if (target.id === ownerId) {
      res.status(400).json({ error: "You cannot add yourself." });
      return;
    }

    if (await isMutualContact(ownerId, target.id)) {
      res.status(409).json({ error: "You are already connected with this person." });
      return;
    }

    const reversePending = await prisma.contactRequest.findUnique({
      where: { fromId_toId: { fromId: target.id, toId: ownerId } },
    });
    if (reversePending) {
      await prisma.$transaction([
        prisma.contactRequest.delete({ where: { id: reversePending.id } }),
        prisma.userContact.upsert({
          where: { ownerId_contactId: { ownerId, contactId: target.id } },
          create: { ownerId, contactId: target.id },
          update: {},
        }),
        prisma.userContact.upsert({
          where: { ownerId_contactId: { ownerId: target.id, contactId: ownerId } },
          create: { ownerId: target.id, contactId: ownerId },
          update: {},
        }),
      ]);
      res.status(201).json({ status: "connected", user: toPublicUser(target) });
      return;
    }

    const existing = await prisma.contactRequest.findUnique({
      where: { fromId_toId: { fromId: ownerId, toId: target.id } },
    });
    if (existing) {
      res.status(409).json({ error: "Request already sent. Wait for them to accept." });
      return;
    }

    const row = await prisma.contactRequest.create({
      data: { fromId: ownerId, toId: target.id },
    });
    res.status(201).json({
      status: "pending",
      request: { id: row.id, to: toPublicUser(target) },
    });
  } catch (error) {
    console.error("sendContactRequest error:", error);
    res.status(500).json({ error: "Failed to send request." });
  }
}

export async function listIncomingContactRequests(req: Request, res: Response): Promise<void> {
  try {
    const me = req.user?.id;
    if (!me) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }
    const rows = await prisma.contactRequest.findMany({
      where: { toId: me },
      include: { from: { select: { id: true, username: true, avatarUrl: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.status(200).json(
      rows.map((r) => ({
        id: r.id,
        createdAt: r.createdAt.toISOString(),
        from: toPublicUser(r.from),
      })),
    );
  } catch (error) {
    console.error("listIncomingContactRequests error:", error);
    res.status(500).json({ error: "Failed to load requests." });
  }
}

export async function listOutgoingContactRequests(req: Request, res: Response): Promise<void> {
  try {
    const me = req.user?.id;
    if (!me) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }
    const rows = await prisma.contactRequest.findMany({
      where: { fromId: me },
      include: { to: { select: { id: true, username: true, avatarUrl: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.status(200).json(
      rows.map((r) => ({
        id: r.id,
        createdAt: r.createdAt.toISOString(),
        to: toPublicUser(r.to),
      })),
    );
  } catch (error) {
    console.error("listOutgoingContactRequests error:", error);
    res.status(500).json({ error: "Failed to load requests." });
  }
}

export async function acceptContactRequest(req: Request, res: Response): Promise<void> {
  try {
    const me = req.user?.id;
    if (!me) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }
    const requestId = typeof req.params.requestId === "string" ? req.params.requestId.trim() : "";
    if (!requestId) {
      res.status(400).json({ error: "requestId is required." });
      return;
    }

    const row = await prisma.contactRequest.findUnique({ where: { id: requestId } });
    if (!row || row.toId !== me) {
      res.status(404).json({ error: "Request not found." });
      return;
    }

    await prisma.$transaction([
      prisma.contactRequest.delete({ where: { id: requestId } }),
      prisma.userContact.upsert({
        where: { ownerId_contactId: { ownerId: row.fromId, contactId: row.toId } },
        create: { ownerId: row.fromId, contactId: row.toId },
        update: {},
      }),
      prisma.userContact.upsert({
        where: { ownerId_contactId: { ownerId: row.toId, contactId: row.fromId } },
        create: { ownerId: row.toId, contactId: row.fromId },
        update: {},
      }),
    ]);

    const fromUser = await prisma.user.findUnique({
      where: { id: row.fromId },
      select: { id: true, username: true, avatarUrl: true },
    });
    if (!fromUser) {
      res.status(500).json({ error: "User missing." });
      return;
    }
    res.status(200).json({ user: toPublicUser(fromUser) });
  } catch (error) {
    console.error("acceptContactRequest error:", error);
    res.status(500).json({ error: "Failed to accept request." });
  }
}

export async function rejectContactRequest(req: Request, res: Response): Promise<void> {
  try {
    const me = req.user?.id;
    if (!me) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }
    const requestId = typeof req.params.requestId === "string" ? req.params.requestId.trim() : "";
    if (!requestId) {
      res.status(400).json({ error: "requestId is required." });
      return;
    }

    const row = await prisma.contactRequest.findUnique({ where: { id: requestId } });
    if (!row || row.toId !== me) {
      res.status(404).json({ error: "Request not found." });
      return;
    }

    await prisma.contactRequest.delete({ where: { id: requestId } });
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error("rejectContactRequest error:", error);
    res.status(500).json({ error: "Failed to reject request." });
  }
}

export async function cancelContactRequest(req: Request, res: Response): Promise<void> {
  try {
    const me = req.user?.id;
    if (!me) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }
    const requestId = typeof req.params.requestId === "string" ? req.params.requestId.trim() : "";
    if (!requestId) {
      res.status(400).json({ error: "requestId is required." });
      return;
    }

    const row = await prisma.contactRequest.findUnique({ where: { id: requestId } });
    if (!row || row.fromId !== me) {
      res.status(404).json({ error: "Request not found." });
      return;
    }

    await prisma.contactRequest.delete({ where: { id: requestId } });
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error("cancelContactRequest error:", error);
    res.status(500).json({ error: "Failed to cancel request." });
  }
}

export async function removeContact(req: Request, res: Response): Promise<void> {
  try {
    const ownerId = req.user?.id;
    if (!ownerId) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }
    const contactId = typeof req.params.contactId === "string" ? req.params.contactId.trim() : "";
    if (!contactId) {
      res.status(400).json({ error: "contactId is required." });
      return;
    }

    const [r1, r2] = await prisma.$transaction([
      prisma.userContact.deleteMany({ where: { ownerId, contactId } }),
      prisma.userContact.deleteMany({ where: { ownerId: contactId, contactId: ownerId } }),
    ]);
    if (r1.count === 0 && r2.count === 0) {
      res.status(404).json({ error: "Contact not found." });
      return;
    }
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error("removeContact error:", error);
    res.status(500).json({ error: "Failed to remove contact." });
  }
}

export async function signup(req: Request, res: Response): Promise<void> {
  try {
    const { fullName: _fullName, username, password, confirmPassword, age, email: bodyEmail } = req.body as {
      fullName?: string;
      username?: string;
      password?: string;
      confirmPassword?: string;
      age?: number;
      email?: string;
    };

    if (typeof age === "number" && age < 16) {
      res.status(400).json({ error: "You must be at least 16 years old." });
      return;
    }

    if (!username || !password || !confirmPassword) {
      res.status(400).json({ error: "Username, password, and confirmation are required." });
      return;
    }

    if (password !== confirmPassword) {
      res.status(400).json({ error: "Passwords do not match." });
      return;
    }

    const existingUsername = await prisma.user.findUnique({ where: { username } });
    if (existingUsername) {
      res.status(400).json({ error: "Username already taken." });
      return;
    }

    let email = typeof bodyEmail === "string" && bodyEmail.trim() ? bodyEmail.trim() : syntheticEmail(username);
    let suffix = 0;
    while (await prisma.user.findUnique({ where: { email } })) {
      suffix += 1;
      email = syntheticEmail(`${username}${suffix}`);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const avatarUrl = `https://api.dicebear.com/8.x/adventurer/svg?seed=${encodeURIComponent(username)}`;

    await prisma.user.create({
      data: {
        username,
        email,
        passwordHash: hashedPassword,
        avatarUrl,
      },
    });

    res.status(201).json({ message: "User registered successfully." });
  } catch (error) {
    console.error("Signup Error:", error);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { username, password } = req.body as { username?: string; password?: string };

    if (!username || !password) {
      res.status(400).json({ error: "Username and password are required." });
      return;
    }

    const user = await prisma.user.findUnique({ where: { username } });

    if (!user) {
      res.status(404).json({ error: "User not found." });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      res.status(401).json({ error: "Invalid password." });
      return;
    }

    const token = generateToken({ id: user.id, username: user.username });

    res.status(200).json({
      message: "Login successful ✅",
      user: {
        id: user.id,
        _id: user.id,
        username: user.username,
        profilePic: user.avatarUrl ?? "",
        avatarUrl: user.avatarUrl,
      },
      token,
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ error: "Something went wrong during login." });
  }
}

export function logout(_req: Request, res: Response): void {
  res.status(200).json({ message: "Logged out" });
}

export async function updateAvatar(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: "No file uploaded." });
      return;
    }
    if (!file.mimetype.startsWith("image/")) {
      res.status(400).json({ error: "Avatar must be an image." });
      return;
    }
    let avatarUrl: string;
    if (isSupabaseStorageConfigured()) {
      const buffer = file.buffer ?? (await fs.readFile(file.path));
      avatarUrl = await uploadFile("avatars", userId, buffer, file.mimetype);
    } else {
      avatarUrl = `/uploads/${file.filename}`;
    }
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
      select: { id: true, username: true, avatarUrl: true },
    });
    res.status(200).json(toPublicUser(updated));
  } catch (error) {
    console.error("updateAvatar error:", error);
    res.status(500).json({ error: "Failed to update avatar." });
  }
}
