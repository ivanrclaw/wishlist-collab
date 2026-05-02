import { Router, Request, Response } from "express";
import { z } from "zod";
import * as https from "https";

export const scrapeRouter = Router();

const scrapeSchema = z.object({
  url: z.string().url().max(2000).refine((u) => u.includes("aliexpress.com"), {
    message: "Only AliExpress URLs are supported",
  }),
});

function fetchPage(url: string): Promise<{ body: string; finalUrl: string }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);

    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Linux; Android 13; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.135 Mobile Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
      },
      timeout: 10000,
    };

    const req = https.request(options, (res) => {
      // Handle redirects
      if (
        res.statusCode &&
        [301, 302, 303, 307, 308].includes(res.statusCode) &&
        res.headers.location
      ) {
        res.resume();
        let redirectUrl = new URL(res.headers.location, url).href;
        // Normalize es.aliexpress → www.aliexpress or keep as-is
        return fetchPage(redirectUrl).then(resolve).catch(reject);
      }

      if (!res.statusCode || res.statusCode >= 400) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode}`));
      }

      const chunks: Buffer[] = [];
      res.on("data", (c: Buffer) => chunks.push(c));
      res.on("end", () => {
        resolve({
          body: Buffer.concat(chunks).toString("utf-8"),
          finalUrl: url,
        });
      });
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
  const patterns = [/\/item\/(\d+)/, /productId=(\d+)/, /\/i\/(\d+)/];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function extractFromHtml(html: string): {
  title: string;
  imageUrl: string;
  price: string;
} {
  let title = "";
  let imageUrl = "";
  let price = "";

  // 1) window.runData (server-side rendered JSON)
  const rdMatch = html.match(/window\.runData\s*=\s*(\{.+?\});\s*<\/script>/s);
  if (rdMatch) {
    try {
      const rd = JSON.parse(rdMatch[1]);
      const p = rd?.data?.priceModule;
      price =
        p?.formatedActivityPrice ||
        p?.formatedPrice ||
        p?.price ||
        "";
      title =
        rd?.data?.pageModule?.title ||
        rd?.data?.titleModule?.subject ||
        "";
      const img =
        rd?.data?.pageModule?.imagePath ||
        rd?.data?.imageModule?.imagePathList?.[0] ||
        "";
      if (img) imageUrl = img.startsWith("//") ? `https:${img}` : img;
    } catch { /* fall through */ }
  }

  // 2) window.__data (another common pattern)
  if (!title) {
    const dcMatch = html.match(/window\.__data\s*=\s*['"](\{.+?\})['"];/s);
    if (dcMatch) {
      try {
        const dc = JSON.parse(dcMatch[1]);
        title = dc?.productInfo?.subject || dc?.title || "";
        price =
          dc?.priceModule?.formatedActivityPrice ||
          dc?.priceModule?.formatedPrice ||
          "";
      } catch { /* fall through */ }
    }
  }

  // 3) Meta tags
  if (!title) {
    const ogt = html.match(
      /<meta\s+property="og:title"\s+content="([^"]+)"/i
    );
    if (ogt) title = ogt[1];
  }
  if (!title) {
    const tt = html.match(/<title>([^<]+)<\/title>/i);
    if (tt) title = tt[1].replace(/\s*[-–|]\s*AliExpress.*$/i, "").trim();
  }
  if (!imageUrl) {
    const ogi = html.match(
      /<meta\s+property="og:image"\s+content="([^"]+)"/i
    );
    if (ogi) imageUrl = ogi[1];
  }
  if (!imageUrl) {
    const bg = html.match(
      /background-image:\s*url\(["']?(https?:\/\/[^"')]+)["']?\)/i
    );
    if (bg) imageUrl = bg[1];
  }

  // Clean
  title = title
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/<[^>]+>/g, "")
    .trim()
    .substring(0, 200);

  return { title: title || "", imageUrl, price };
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

  const hosts = [
    `https://es.aliexpress.com/item/${productId}.html`,
    `https://www.aliexpress.com/item/${productId}.html`,
    `https://m.aliexpress.com/item/${productId}.html`,
  ];

  let lastError = "";

  for (const hostUrl of hosts) {
    try {
      const { body } = await fetchPage(hostUrl);
      const { title, imageUrl, price } = extractFromHtml(body);

      if (title) {
        res.json({
          title,
          imageUrl,
          price,
          url: `https://es.aliexpress.com/item/${productId}.html`,
        });
        return;
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }

  // All attempts failed — return partial
  res.json({
    title: "Unknown product",
    imageUrl: "",
    price: "",
    url: `https://es.aliexpress.com/item/${productId}.html`,
  });
});
