import { Router, Request, Response } from "express";
import { z } from "zod";
import { nanoid } from "nanoid";
import { AppDataSource } from "../config/database";
import { Wishlist } from "../entities/Wishlist";
import { authMiddleware, AuthRequest } from "../middleware/auth";

export const wishlistRouter = Router();

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
});

// List own wishlists
wishlistRouter.get("/", authMiddleware, async (req: AuthRequest, res: Response) => {
  const repo = AppDataSource.getRepository(Wishlist);
  const wishlists = await repo.find({
    where: { userId: req.userId! },
    order: { updatedAt: "DESC" },
  });
  res.json(wishlists);
});

// Create
wishlistRouter.post("/", authMiddleware, async (req: AuthRequest, res: Response) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }

  const repo = AppDataSource.getRepository(Wishlist);
  const wishlist = repo.create({
    ...parsed.data,
    slug: nanoid(12),
    editSlug: nanoid(16),
    userId: req.userId!,
  });
  await repo.save(wishlist);
  res.status(201).json(wishlist);
});

// Get by slug (public read-only)
wishlistRouter.get("/s/:slug", async (req: Request, res: Response) => {
  const repo = AppDataSource.getRepository(Wishlist);
  const wishlist = await repo.findOne({
    where: { slug: req.params.slug as string },
    relations: ["items"],
  });
  if (!wishlist) {
    res.status(404).json({ error: "Wishlist not found" });
    return;
  }
  const { userId, ...safe } = wishlist;
  res.json(safe);
});

// Manage (owner only)
wishlistRouter.put("/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
  const repo = AppDataSource.getRepository(Wishlist);
  const wishlist = await repo.findOneBy({ id: +req.params.id });
  if (!wishlist) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (wishlist.userId !== req.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  repo.merge(wishlist, parsed.data);
  await repo.save(wishlist);
  res.json(wishlist);
});

wishlistRouter.delete("/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
  const repo = AppDataSource.getRepository(Wishlist);
  const wishlist = await repo.findOneBy({ id: +req.params.id });
  if (!wishlist) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (wishlist.userId !== req.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  await repo.remove(wishlist);
  res.status(204).send();
});
