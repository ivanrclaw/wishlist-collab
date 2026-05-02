import { Router, Request, Response } from "express";
import { z } from "zod";
import * as crypto from "crypto";

export const scrapeRouter = Router();

// ------------------------------------------------------------------
// AliExpress Official Affiliate API
// Docs: https://openservice.aliexpress.com/doc/api.htm
// Endpoint: http://gw.api.taobao.com/router/rest  (HTTP, no HTTPS)
// Method:   aliexpress.affiliate.productdetail.get
//
// Requires APP_KEY + APP_SECRET from:
//   1. Register at https://seller.aliexpress.com
//   2. Go to https://developers.aliexpress.com → Create App
//   3. Set env vars: ALIEXPRESS_APP_KEY / ALIEXPRESS_APP_SECRET
// ------------------------------------------------------------------

const API_URL = "http://gw.api.taobao.com/router/rest";

const scrapeSchema = z.object({
  url: z.string().url().max(2000).refine((u) => u.includes("aliexpress.com"), {
    message: "Only AliExpress URLs are supported",
  }),
});

function signRequest(params: Record<string, string>, secret: string): string {
  // Sort keys alphabetically
  const sorted = Object.keys(params)
    .sort()
    .reduce(
      (acc, k) => {
        acc[k] = params[k];
        return acc;
      },
      {} as Record<string, string>
    );

  // Concat: secret + key1value1key2value2... + secret
  const payload = Object.entries(sorted)
    .map(([k, v]) => `${k}${v}`)
    .join("");
  const raw = `${secret}${payload}${secret}`;

  return crypto.createHash("md5").update(raw, "utf8").digest("hex").toUpperCase();
}

function extractProductId(url: string): string | null {
  const patterns = [/\/item\/(\d+)/, /productId=(\d+)/, /\/i\/(\d+)/];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function timestamp(): string {
  return new Date()
    .toISOString()
    .replace(/T/, " ")
    .replace(/Z/, "")
    .replace(/\..+/, "");
}

async function fetchProductViaAffiliateApi(
  productId: string,
  appKey: string,
  appSecret: string
): Promise<{ title: string; imageUrl: string; price: string }> {
  const params: Record<string, string> = {
    method: "aliexpress.affiliate.productdetail.get",
    app_key: appKey,
    sign_method: "md5",
    timestamp: timestamp(),
    format: "json",
    v: "2.0",
    product_ids: productId,
    target_currency: "EUR",
    target_language: "ES",
    fields:
      "product_title,sale_price,product_main_image_url,target_sale_price,target_original_price",
    trackingId: "default",
  };

  const sign = signRequest(params, appSecret);
  const body = new URLSearchParams({ ...params, sign });

  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
    body,
  });

  if (!res.ok) throw new Error(`API returned ${res.status}`);

  const json = await res.json() as any;

  if (json.error_response) {
    throw new Error(
      json.error_response.sub_msg || json.error_response.msg || "API error"
    );
  }

  const result = json?.aliexpress_affiliate_productdetail_get_response?.resp_result?.result;
  if (!result || !result.products || result.products.length === 0) {
    throw new Error("No product data in API response");
  }

  const product = result.products[0];
  return {
    title: (product.product_title || "").substring(0, 200),
    imageUrl: product.product_main_image_url || "",
    price: product.target_sale_price
      ? `${product.target_sale_price} €`
      : product.sale_price
        ? `${product.sale_price}`
        : "",
  };
}

// ------------------------------------------------------------------
// Route handler
// ------------------------------------------------------------------
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

  const appKey = process.env.ALIEXPRESS_APP_KEY;
  const appSecret = process.env.ALIEXPRESS_APP_SECRET;

  if (!appKey || !appSecret) {
    // Keys not configured → tell frontend to fall back to manual input
    res.json({
      title: "",
      imageUrl: "",
      price: "",
      url: `https://es.aliexpress.com/item/${productId}.html`,
      error: "AliExpress API keys not configured",
    });
    return;
  }

  try {
    const data = await fetchProductViaAffiliateApi(productId, appKey, appSecret);

    if (data.title) {
      res.json({
        title: data.title,
        imageUrl: data.imageUrl,
        price: data.price,
        url: `https://es.aliexpress.com/item/${productId}.html`,
      });
    } else {
      res.json({
        title: "Unknown product",
        imageUrl: data.imageUrl,
        price: data.price,
        url: `https://es.aliexpress.com/item/${productId}.html`,
      });
    }
  } catch (err) {
    console.error("AliExpress API error:", err);
    // Don't fail — return empty so the frontend can show manual input
    res.json({
      title: "",
      imageUrl: "",
      price: "",
      url: `https://es.aliexpress.com/item/${productId}.html`,
      error: err instanceof Error ? err.message : "Scrape failed",
    });
  }
});
