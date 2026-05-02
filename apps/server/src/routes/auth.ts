import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { AppDataSource } from "../config/database";
import { User } from "../entities/User";
import { authMiddleware, AuthRequest } from "../middleware/auth";

export const authRouter = Router();
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";

const registerSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(100).optional(),
});

authRouter.post("/register", async (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }

  const { email, password, name } = parsed.data;
  const userRepo = AppDataSource.getRepository(User);

  const existing = await userRepo.findOneBy({ email: email.toLowerCase() });
  if (existing) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  const hash = await bcrypt.hash(password, 12);
  const user = userRepo.create({
    email: email.toLowerCase(),
    password: hash,
    name: name || "",
  });
  await userRepo.save(user);

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });

  res.status(201).json({
    token,
    user: { id: user.id, email: user.email, name: user.name },
  });
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

authRouter.post("/login", async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const { email, password } = parsed.data;
  const userRepo = AppDataSource.getRepository(User);

  const user = await userRepo.findOneBy({ email: email.toLowerCase() });
  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });

  res.json({
    token,
    user: { id: user.id, email: user.email, name: user.name },
  });
});

authRouter.get("/me", authMiddleware, async (req: AuthRequest, res: Response) => {
  const userRepo = AppDataSource.getRepository(User);
  const user = await userRepo.findOneBy({ id: req.userId! });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({ id: user.id, email: user.email, name: user.name });
});
