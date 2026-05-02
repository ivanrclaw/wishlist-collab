import { Router, Request, Response } from "express";
import { z } from "zod";
import { AppDataSource } from "../config/database";
import { Wishlist } from "../entities/Wishlist";
import { Item } from "../entities/Item";
import { authMiddleware, AuthRequest } from "../middleware/auth";

export const itemRouter = Router();

const addItemSchema = z.object({
  title: z.string().min(1).max(200),
  url: z.string().url().max(2000).refine((u) => u.includes("aliexpress.com"), {
    message: "Only AliExpress URLs are supported",
  }),
  imageUrl: z.string().url().max(500).optional().or(z.literal("")),
  price: z.string().max(100).optional().or(z.literal("")),
});

// Add item via edit slug (public — anyone with the edit link)
itemRouter.post("/add/:editSlug", async (req: Request, res: Response) => {
  const parsed = addItemSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }

  const wishlistRepo = AppDataSource.getRepository(Wishlist);
  const wishlist = await wishlistRepo.findOneBy({ editSlug: req.params.editSlug as string });

  if (!wishlist) {
    res.status(404).json({ error: "Wishlist not found" });
    return;
  }

  const itemRepo = AppDataSource.getRepository(Item);
  const item = itemRepo.create({
    ...parsed.data,
    wishlistId: wishlist.id,
  });
  await itemRepo.save(item);

  res.status(201).json(item);
});

// Delete item (owner only)
itemRouter.delete("/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
  const itemRepo = AppDataSource.getRepository(Item);
  const item = await itemRepo.findOne({
    where: { id: +req.params.id },
    relations: ["wishlist"],
  });

  if (!item) {
    res.status(404).json({ error: "Item not found" });
    return;
  }

  if (item.wishlist.userId !== req.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  await itemRepo.remove(item);
  res.status(204).send();
});

// Toggle purchased (owner only)
itemRouter.patch("/:id/purchased", authMiddleware, async (req: AuthRequest, res: Response) => {
  const itemRepo = AppDataSource.getRepository(Item);
  const item = await itemRepo.findOne({
    where: { id: +req.params.id },
    relations: ["wishlist"],
  });

  if (!item) {
    res.status(404).json({ error: "Item not found" });
    return;
  }

  if (item.wishlist.userId !== req.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  item.purchased = !item.purchased;
  await itemRepo.save(item);
  res.json(item);
});
