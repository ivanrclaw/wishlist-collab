import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/utils";
import {
  Loader2,
  Link2,
  ShoppingBag,
  CheckCircle,
  Sparkles,
  Pencil,
} from "lucide-react";

interface ProductPreview {
  title: string;
  imageUrl: string;
  price: string;
  url: string;
}

interface AddItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editSlug: string;
  onAdded: () => void;
}

function extractFromAliExpressHtml(html: string): Partial<ProductPreview> {
  let title = "";
  let imageUrl = "";
  let price = "";

  // window.runData
  const rd = html.match(/window\.runData\s*=\s*(\{.+?\});\s*<\/script>/s);
  if (rd) {
    try {
      const d = JSON.parse(rd[1]);
      title = d?.data?.pageModule?.title || d?.data?.titleModule?.subject || "";
      price =
        d?.data?.priceModule?.formatedActivityPrice ||
        d?.data?.priceModule?.formatedPrice ||
        "";
      const img =
        d?.data?.pageModule?.imagePath ||
        d?.data?.imageModule?.imagePathList?.[0] ||
        "";
      if (img) imageUrl = img.startsWith("//") ? `https:${img}` : img;
    } catch {}
  }

  // Meta fallbacks
  if (!title) {
    const ogt = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i);
    if (ogt) title = ogt[1];
  }
  if (!title) {
    const tt = html.match(/<title>([^<]+)<\/title>/i);
    if (tt) title = tt[1].replace(/\s*[-–|]\s*AliExpress.*$/i, "").trim();
  }
  if (!imageUrl) {
    const ogi = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);
    if (ogi) imageUrl = ogi[1];
  }

  title = title
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/<[^>]+>/g, "")
    .trim()
    .substring(0, 200);

  return { title, imageUrl, price };
}

export default function AddItemModal({
  open,
  onOpenChange,
  editSlug,
  onAdded,
}: AddItemModalProps) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<ProductPreview | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editImage, setEditImage] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [added, setAdded] = useState(false);
  const [scrapeFailed, setScrapeFailed] = useState(false);

  const handleScrape = async () => {
    setError("");
    setPreview(null);
    setScrapeFailed(false);
    setLoading(true);

    try {
      // Strategy 1: Try backend first
      const res = await apiFetch("/scrape", {
        method: "POST",
        body: JSON.stringify({ url }),
      });
      const data = await res.json();

      if (data.title && data.title !== "Unknown product") {
        setPreview(data);
        setEditTitle(data.title);
        setEditImage(data.imageUrl || "");
        setEditPrice(data.price || "");
        setLoading(false);
        return;
      }

      // Strategy 2: Client-side fetch via CORS proxy
      const productId = url.match(/\/item\/(\d+)/)?.[1];
      if (!productId) throw new Error("No product ID");

      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(
        `https://es.aliexpress.com/item/${productId}.html`
      )}`;

      const proxyRes = await fetch(proxyUrl);
      if (!proxyRes.ok) throw new Error("Proxy failed");

      const html = await proxyRes.text();
      const extracted = extractFromAliExpressHtml(html);

      if (extracted.title) {
        const result = {
          title: extracted.title,
          imageUrl: extracted.imageUrl || "",
          price: extracted.price || "",
          url: `https://es.aliexpress.com/item/${productId}.html`,
        };
        setPreview(result);
        setEditTitle(result.title);
        setEditImage(result.imageUrl);
        setEditPrice(result.price);
      } else {
        throw new Error("Could not extract");
      }
    } catch {
      setScrapeFailed(true);
      setError(
        "No se pudo extraer la información automáticamente. Puedes rellenar los datos manualmente."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    setAdding(true);
    setError("");

    const finalTitle = editTitle || preview?.title || "";
    if (!finalTitle.trim()) {
      setError("El título es obligatorio");
      setAdding(false);
      return;
    }

    try {
      await apiFetch(`/items/add/${editSlug}`, {
        method: "POST",
        body: JSON.stringify({
          title: finalTitle,
          url: preview?.url || url,
          imageUrl: editImage,
          price: editPrice,
        }),
      });
      setAdded(true);
      setTimeout(() => {
        setAdded(false);
        setUrl("");
        setPreview(null);
        setScrapeFailed(false);
        setEditTitle("");
        setEditImage("");
        setEditPrice("");
        onOpenChange(false);
        onAdded();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al añadir");
    } finally {
      setAdding(false);
    }
  };

  const handleOpenChange = (o: boolean) => {
    if (!o) {
      setUrl("");
      setPreview(null);
      setError("");
      setAdded(false);
      setScrapeFailed(false);
      setEditTitle("");
      setEditImage("");
      setEditPrice("");
    }
    onOpenChange(o);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Link2 className="h-5 w-5 text-brand" />
            Añadir producto
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 pt-2">
          {added ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="rounded-full bg-green-100 p-3 dark:bg-green-900/30">
                <CheckCircle className="h-10 w-10 text-green-500" />
              </div>
              <p className="text-lg font-semibold">¡Añadido!</p>
            </div>
          ) : (
            <>
              {/* URL input */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="product-url">Link de AliExpress</Label>
                <div className="flex gap-2">
                  <Input
                    id="product-url"
                    type="url"
                    placeholder="https://es.aliexpress.com/item/..."
                    value={url}
                    onChange={(e) => {
                      setUrl(e.target.value);
                      setError("");
                      setPreview(null);
                      setScrapeFailed(false);
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleScrape()}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleScrape}
                    disabled={!url || loading}
                    size="md"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {error && (
                <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">
                  {error}
                </div>
              )}

              {/* Preview / Manual edit */}
              {(preview || scrapeFailed) && (
                <div className="flex flex-col gap-3">
                  {/* Image */}
                  {(editImage || preview?.imageUrl) ? (
                    <div className="overflow-hidden rounded-xl bg-white p-3 dark:bg-zinc-800">
                      <img
                        src={editImage || preview?.imageUrl}
                        alt="Preview"
                        className="mx-auto h-40 object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </div>
                  ) : (
                    scrapeFailed && (
                      <div className="flex h-24 items-center justify-center rounded-xl bg-surface-alt dark:bg-zinc-800">
                        <ShoppingBag className="h-8 w-8 text-zinc-400" />
                      </div>
                    )
                  )}

                  {/* Editable fields */}
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-col gap-1">
                      <Label htmlFor="edit-title" className="text-xs text-zinc-500">
                        Título *
                      </Label>
                      <Input
                        id="edit-title"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder="Nombre del producto"
                        maxLength={200}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col gap-1">
                        <Label htmlFor="edit-image" className="text-xs text-zinc-500">
                          Imagen (URL)
                        </Label>
                        <Input
                          id="edit-image"
                          value={editImage}
                          onChange={(e) => setEditImage(e.target.value)}
                          placeholder="https://..."
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <Label htmlFor="edit-price" className="text-xs text-zinc-500">
                          Precio
                        </Label>
                        <Input
                          id="edit-price"
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                          placeholder="12,99 €"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Add button */}
              {(preview || scrapeFailed) && (
                <Button
                  onClick={handleAdd}
                  disabled={adding || !editTitle.trim()}
                  className="w-full"
                  size="lg"
                >
                  {adding ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Añadiendo...
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="h-4 w-4" /> Añadir a la lista
                    </>
                  )}
                </Button>
              )}

              <p className="text-center text-xs text-zinc-400">
                Pega un link de AliExpress y se rellenará automáticamente. Si falla, edita los campos.
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
