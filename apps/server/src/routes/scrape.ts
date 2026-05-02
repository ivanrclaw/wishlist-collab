import { Router, Request, Response } from "express";
import { z } from "zod";
import * as https from "https";

export const scrapeRouter = Router();

const scrapeSchema = z.object({
  url: z.string().url().max(2000).refine((u) => u.includes("aliexpress.com"), {
    message: "Only AliExpress URLs are supported",
  }),
});

function httpsGet(url: string, headers: Record<string, string> = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);

    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9,es;q=0.8",
        Referer: "https://www.aliexpress.com/",
        ...headers,
      },
      timeout: 8000,
    };

    const req = https.request(options, (res) => {
      // Follow redirects
      if (
        res.statusCode &&
        [301, 302, 303, 307, 308].includes(res.statusCode) &&
        res.headers.location
      ) {
        res.resume();
        const redirectUrl = new URL(res.headers.location, url).href;
        return httpsGet(redirectUrl, headers).then(resolve).catch(reject);
      }

      const chunks: Buffer[] = [];
      res.on("data", (c: Buffer) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    });

    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Request timed out"));
    });
    req.end();
  });
}

function extractProductId(url: string): string | null {
  // Patterns: /item/1005006143501688.html, /item/1005006143501688, productId=1005006143501688
  const patterns = [
    /\/item\/(\d+)/,
    /productId=(\d+)/,
    /\/products\/(\d+)/,
    /\/i\/(\d+)/,
  ];

  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function cleanJsonp(text: string): string {
  // Remove JSONP wrapper: mtopjsonp1({...}) -> {...}
  let cleaned = text.replace(/^[^(]*\(/, "").replace(/\)\s*$/, "");
  // Sometimes double-wrapped
  if (cleaned.startsWith('"') || cleaned.startsWith("{")) {
    try {
      JSON.parse(cleaned);
      return cleaned;
    } catch {
      // Not valid yet, try more cleaning
    }
  }
  return cleaned;
}

async function scrapeViaApi(productId: string): Promise<{
  title: string;
  image: string;
  price: string;
} | null> {
  const apiHosts = [
    "www.aliexpress.com",
    "es.aliexpress.com",
    "aliexpress.com",
  ];

  for (const host of apiHosts) {
    try {
      // Try the header API endpoint
      const apiUrl = `https://${host}/aeglodetailweb/api/header?productId=${productId}`;
      const raw = await httpsGet(apiUrl, {
        Referer: `https://${host}/item/${productId}.html`,
      });

      const data = JSON.parse(raw);

      const title =
        data?.data?.productInfo?.subject ||
        data?.data?.title ||
        data?.productInfo?.subject ||
        "";

      const image =
        data?.data?.productInfo?.imageUrl ||
        data?.data?.imageUrl ||
        "";

      const price =
        data?.data?.priceModule?.formatedActivityPrice ||
        data?.data?.priceModule?.formatedPrice ||
        data?.data?.productInfo?.price ||
        "";

      if (title) {
        return {
          title: title.substring(0, 200),
          image: image.startsWith("//") ? `https:${image}` : image,
          price: price || "",
        };
      }
    } catch {
      // Try next host
    }
  }

  return null;
}

async function scrapeViaPage(productId: string): Promise<{
  title: string;
  image: string;
  price: string;
}> {
  const hosts = ["es.aliexpress.com", "www.aliexpress.com", "aliexpress.com"];

  for (const host of hosts) {
    try {
      const url = `https://${host}/item/${productId}.html`;
      const html = await httpsGet(url);

      let title = "";
      let image = "";
      let price = "";

      // Extract from runData
      const runDataMatch = html.match(/window\.runData\s*=\s*(\{.+?\});/s);
      if (runDataMatch) {
        try {
          const data = JSON.parse(runDataMatch[1]);
          title =
            data?.data?.pageModule?.title ||
            data?.data?.titleModule?.subject ||
            "";
          image =
            data?.data?.pageModule?.imagePath ||
            data?.data?.imageModule?.imagePathList?.[0] ||
            "";
          price =
            data?.data?.priceModule?.formatedActivityPrice ||
            data?.data?.priceModule?.formatedPrice ||
            "";
          if (image && image.startsWith("//")) image = `https:${image}`;
        } catch { /* fall through */ }
      }

      // Fallbacks
      if (!title) {
        const ogTitle = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i);
        if (ogTitle) title = ogTitle[1];
      }
      if (!title) {
        const t = html.match(/<title>([^<]+)<\/title>/i);
        if (t) title = t[1].replace(/\s*[-–|]\s*AliExpress.*$/i, "").trim();
      }
      if (!image) {
        const ogImg = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);
        if (ogImg) image = ogImg[1];
      }
      if (!image) {
        const bgImg = html.match(/background-image:\s*url\(["']?(https?:\/\/[^"')]+)["']?\)/i);
        if (bgImg) image = bgImg[1];
      }

      // Clean
      title = title
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#x27;/g, "'")
        .replace(/<[^>]+>/g, "")
        .trim()
        .substring(0, 200);

      if (title) {
        return { title, image, price };
      }
    } catch {
      // Try next host
    }
  }

  // Absolute last resort
  return {
    title: "",
    image: "",
    price: "",
  };
}

scrapeRouter.post("/", async (req: Request, res: Response) => {
  const parsed = scrapeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid input",
      details: parsed.error.flatten(),
    });
    return;
  }

  const { url } = parsed.data;
  const productId = extractProductId(url);

  if (!productId) {
    res.status(400).json({
      error: "Could not extract product ID from URL",
      title: "Unknown product",
      imageUrl: "",
      price: "",
      url,
    });
    return;
  }

  try {
    // Strategy 1: Internal API (fast, JSON)
    const apiResult = await scrapeViaApi(productId);

    if (apiResult && apiResult.title) {
      res.json({
        title: apiResult.title,
        imageUrl: apiResult.image,
        price: apiResult.price,
        url: `https://es.aliexpress.com/item/${productId}.html`,
      });
      return;
    }

    // Strategy 2: Scrape HTML page
    const pageResult = await scrapeViaPage(productId);

    res.json({
      title: pageResult.title || "Unknown product",
      imageUrl: pageResult.image,
      price: pageResult.price,
      url: `https://es.aliexpress.com/item/${productId}.html`,
    });
  } catch (err) {
    console.error("AliExpress scrape error:", err);
    res.status(500).json({ error: "Failed to extract product data" });
  }
});
