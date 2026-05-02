import { Router, Request, Response } from "express";
import { z } from "zod";
import * as https from "https";
import * as http from "http";

export const scrapeRouter = Router();

const scrapeSchema = z.object({
  url: z.string().url().max(2000).refine((u) => u.includes("aliexpress.com"), {
    message: "Only AliExpress URLs are supported",
  }),
});

function fetchWithRedirects(
  url: string,
  maxRedirects = 5
): Promise<{ body: string; finalUrl: string }> {
  return new Promise((resolve, reject) => {
    const doFetch = (currentUrl: string, redirectsLeft: number) => {
      const parsed = new URL(currentUrl);
      const client = parsed.protocol === "https:" ? https : http;

      const options = {
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        method: "GET",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9,es;q=0.8",
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
        timeout: 8000,
      };

      const req = client.request(options, (response) => {
        // Handle redirects
        if (
          response.statusCode &&
          [301, 302, 303, 307, 308].includes(response.statusCode) &&
          response.headers.location &&
          redirectsLeft > 0
        ) {
          const redirectUrl = new URL(
            response.headers.location,
            currentUrl
          ).href;
          response.resume();
          return doFetch(redirectUrl, redirectsLeft - 1);
        }

        if (!response.statusCode || response.statusCode >= 400) {
          response.resume();
          return reject(
            new Error(`HTTP ${response.statusCode} from AliExpress`)
          );
        }

        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => chunks.push(chunk));
        response.on("end", () => {
          resolve({
            body: Buffer.concat(chunks).toString("utf-8"),
            finalUrl: currentUrl,
          });
        });
      });

      req.on("error", reject);
      req.on("timeout", () => {
        req.destroy();
        reject(new Error("Request timed out"));
      });

      req.end();
    };

    doFetch(url, maxRedirects);
  });
}

function extractData(html: string, url: string) {
  let title = "";
  let imageUrl = "";
  let price = "";

  // Strategy 1: Extract from __DATA__ or window.runData (server-side rendered data)
  const dataPatterns = [
    /window\.runData\s*=\s*(\{.+?\});/s,
    /window\.__DATA__\s*=\s*(\{.+?\});/s,
    /data:\s*(\{.+?"pageModule".+?\}),\s*\n/s,
  ];

  for (const pattern of dataPatterns) {
    const match = html.match(pattern);
    if (match) {
      try {
        const data = JSON.parse(match[1]);

        // Navigate common price paths
        const pricePaths = [
          () =>
            data?.data?.priceModule?.formatedActivityPrice ||
            data?.data?.priceModule?.formatedPrice,
          () =>
            data?.priceModule?.formatedActivityPrice ||
            data?.priceModule?.formatedPrice,
          () =>
            data?.pageModule?.price ||
            data?.priceModule?.formatedPrice,
          () => data?.price,
        ];

        for (const getPrice of pricePaths) {
          const p = getPrice();
          if (p && typeof p === "string" && p.trim()) {
            price = p;
            break;
          }
        }

        // Navigate title paths
        const titlePaths = [
          () =>
            data?.data?.pageModule?.title ||
            data?.data?.titleModule?.subject,
          () => data?.titleModule?.subject,
          () => data?.pageModule?.title,
          () => data?.title,
        ];

        for (const getTitle of titlePaths) {
          const t = getTitle();
          if (t && typeof t === "string" && t.trim()) {
            title = t;
            break;
          }
        }

        // Navigate image paths
        const imagePaths = [
          () =>
            data?.data?.pageModule?.imagePath ||
            data?.data?.imageModule?.imagePathList?.[0],
          () => data?.imageModule?.imagePathList?.[0],
          () => data?.pageModule?.imagePath,
          () => data?.image,
        ];

        for (const getImage of imagePaths) {
          const img = getImage();
          if (img && typeof img === "string" && img.trim()) {
            imageUrl = img.startsWith("//") ? `https:${img}` : img;
            break;
          }
        }

        if (title && price) break; // Got enough data
      } catch {
        // parse failed, try next strategy
      }
    }
  }

  // Strategy 2: Meta tags + og tags
  if (!title) {
    const ogTitle = html.match(
      /<meta\s+property="og:title"\s+content="([^"]+)"/i
    );
    if (ogTitle) title = ogTitle[1];
  }
  if (!title) {
    const titleTag = html.match(/<title>([^<]+)<\/title>/i);
    if (titleTag) {
      title = titleTag[1]
        .replace(/\s*[-–|]\s*AliExpress.*$/i, "")
        .replace(/^\s+|\s+$/g, "");
    }
  }

  if (!imageUrl) {
    const ogImage = html.match(
      /<meta\s+property="og:image"\s+content="([^"]+)"/i
    );
    if (ogImage) imageUrl = ogImage[1];
  }

  // Strategy 3: CSS background-image on product image
  if (!imageUrl) {
    const bgImg = html.match(
      /background-image:\s*url\(["']?(https?:\/\/[^"')]+)["']?\)/i
    );
    if (bgImg) imageUrl = bgImg[1];
  }

  // Clean title
  title = title
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/<[^>]+>/g, "")
    .replace(/^\s+|\s+$/g, "")
    .substring(0, 200);

  return {
    title: title || "Unknown product",
    imageUrl,
    price: price || "",
    url,
  };
}

scrapeRouter.post("/", async (req: Request, res: Response) => {
  const parsed = scrapeSchema.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }

  let { url } = parsed.data;

  try {
    // Clean URL
    const urlObj = new URL(url);
    url = urlObj.origin + urlObj.pathname;

    const { body: html, finalUrl } = await fetchWithRedirects(url);
    const data = extractData(html, finalUrl);

    res.json(data);
  } catch (err) {
    console.error("AliExpress scrape error:", err);
    res.status(500).json({ error: "Failed to extract product data" });
  }
});
