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

export default function AddItemModal({
  open,
  onOpenChange,
  editSlug,
  onAdded,
}: AddItemModalProps) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<ProductPreview | null>(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [added, setAdded] = useState(false);

  const handleScrape = async () => {
    setError("");
    setPreview(null);
    setLoading(true);

    try {
      const res = await apiFetch("/scrape", {
        method: "POST",
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      setPreview(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo obtener el producto. ¿Es un link válido de AliExpress?"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!preview) return;
    setAdding(true);
    setError("");

    try {
      await apiFetch(`/items/add/${editSlug}`, {
        method: "POST",
        body: JSON.stringify({
          title: preview.title,
          url: preview.url,
          imageUrl: preview.imageUrl,
          price: preview.price,
        }),
      });
      setAdded(true);
      setTimeout(() => {
        setAdded(false);
        setUrl("");
        setPreview(null);
        onOpenChange(false);
        onAdded();
      }, 1200);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al añadir producto"
      );
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

              {/* Preview card */}
              {preview && (
                <div className="animate-in overflow-hidden rounded-2xl border border-zinc-200 bg-surface-alt dark:border-zinc-700 dark:bg-zinc-800">
                  {preview.imageUrl ? (
                    <div className="relative h-44 overflow-hidden bg-white">
                      <img
                        src={preview.imageUrl}
                        alt={preview.title}
                        className="h-full w-full object-contain p-4"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </div>
                  ) : (
                    <div className="flex h-32 items-center justify-center bg-surface">
                      <ShoppingBag className="h-10 w-10 text-zinc-300" />
                    </div>
                  )}
                  <div className="p-4">
                    <h4 className="line-clamp-2 font-semibold">
                      {preview.title}
                    </h4>
                    <div className="mt-2 flex items-center justify-between">
                      {preview.price && (
                        <span className="text-xl font-bold text-brand">
                          {preview.price}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Add button */}
              {preview && (
                <Button
                  onClick={handleAdd}
                  disabled={adding}
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
                Pega un link de AliExpress y se rellenará automáticamente.
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
