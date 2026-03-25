import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";
import generateToken from "../utils/generateToken.js";
import { toPublicUser } from "../lib/serialize.js";

function syntheticEmail(username: string): string {
  const safe = username.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${safe}@users.local`;
}

/** People you added — same shape as before; `GET /api/auth/users` kept for the client. */
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
    res.status(200).json(rows.map((r) => toPublicUser(r.contact)));
  } catch (error) {
    console.error("listContacts error:", error);
    res.status(500).json({ error: "Failed to fetch contacts." });
  }
}

export async function addContact(req: Request, res: Response): Promise<void> {
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

    const contact = await prisma.user.findUnique({
      where: { username },
      select: { id: true, username: true, avatarUrl: true },
    });
    if (!contact) {
      res.status(404).json({ error: "User not found." });
      return;
    }
    if (contact.id === ownerId) {
      res.status(400).json({ error: "You cannot add yourself." });
      return;
    }

    try {
      await prisma.userContact.create({
        data: { ownerId, contactId: contact.id },
      });
    } catch (e: unknown) {
      const code = typeof e === "object" && e && "code" in e ? (e as { code: string }).code : "";
      if (code === "P2002") {
        res.status(409).json({ error: "Already in your contacts." });
        return;
      }
      throw e;
    }

    res.status(201).json(toPublicUser(contact));
  } catch (error) {
    console.error("addContact error:", error);
    res.status(500).json({ error: "Failed to add contact." });
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

    const result = await prisma.userContact.deleteMany({
      where: { ownerId, contactId },
    });
    if (result.count === 0) {
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
    const publicPath = `/uploads/${file.filename}`;
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: publicPath },
      select: { id: true, username: true, avatarUrl: true },
    });
    res.status(200).json(toPublicUser(updated));
  } catch (error) {
    console.error("updateAvatar error:", error);
    res.status(500).json({ error: "Failed to update avatar." });
  }
}
