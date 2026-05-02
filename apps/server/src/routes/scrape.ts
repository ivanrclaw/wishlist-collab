import { Router, Request, Response } from "express";
import { z } from "zod";

export const scrapeRouter = Router();

const scrapeSchema = z.object({
  url: z.string().url().max(2000).refine((u) => u.includes("aliexpress.com"), {
    message: "Only AliExpress URLs are supported",
  }),
});

scrapeRouter.post("/", async (req: Request, res: Response) => {
  const parsed = scrapeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }

  const { url } = parsed.data;

  try {
    // Clean URL: remove tracking params, keep only item ID
    const cleanUrl = url.split("?")[0];

    const response = await fetch(cleanUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9,es;q=0.8",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      res.status(502).json({ error: "Could not fetch AliExpress page" });
      return;
    }

    const html = await response.text();

    // Extract data from meta tags / JSON-LD / page data
    let title = "";
    let imageUrl = "";
    let price = "";

    // Try JSON-LD first (structured data)
    const jsonLdMatch = html.match(
      /<script type="application\/ld\+json">([^<]+)<\/script>/
    );
    if (jsonLdMatch) {
      try {
        const ld = JSON.parse(jsonLdMatch[1]);
        title = ld.name || "";
        if (ld.image) {
          imageUrl = typeof ld.image === "string" ? ld.image : ld.image[0] || "";
        }
        if (ld.offers?.price) {
          price = `${ld.offers.price} ${ld.offers.priceCurrency || "€"}`;
        }
      } catch {
        // JSON-LD parse failed, fall through to meta tags
      }
    }

    // Fallback to meta tags
    if (!title) {
      const ogTitle = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i);
      if (ogTitle) title = ogTitle[1];
    }
    if (!title) {
      const titleTag = html.match(/<title>([^<]+)<\/title>/i);
      if (titleTag) title = titleTag[1].replace(/ - AliExpress.*$/i, "").trim();
    }

    if (!imageUrl) {
      const ogImage = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);
      if (ogImage) imageUrl = ogImage[1];
    }

    // Try window.runData pattern for price
    const runDataMatch = html.match(
      /window\.runData\s*=\s*({.+?});\s*<\/script>/s
    );
    if (!price && runDataMatch) {
      try {
        const runData = JSON.parse(runDataMatch[1]);
        const priceData =
          runData?.data?.pageModule?.price ||
          runData?.data?.priceModule?.formatedActivityPrice ||
          runData?.data?.priceModule?.formatedPrice;
        if (priceData) price = priceData;
      } catch {
        // runData parse failed
      }
    }

    // Clean up title
    title = title.replace(/^\s+|\s+$/g, "").substring(0, 200);

    res.json({
      title: title || "Unknown product",
      imageUrl,
      price: price || "",
      url: cleanUrl,
    });
  } catch (err) {
    console.error("AliExpress scrape error:", err);
    res.status(500).json({ error: "Failed to extract product data" });
  }
});
