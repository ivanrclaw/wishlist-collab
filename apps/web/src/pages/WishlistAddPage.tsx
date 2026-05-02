import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { apiFetch } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Gift, Send, CheckCircle } from "lucide-react";

export default function WishlistAddPage() {
  const { slug } = useParams<{ slug: string }>();
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setLoading(true);

    try {
      await apiFetch(`/items/add/${slug}`, {
        method: "POST",
        body: JSON.stringify({
          title,
          url,
          imageUrl: imageUrl || undefined,
          price: price || undefined,
        }),
      });
      setSuccess(true);
      setTitle("");
      setUrl("");
      setImageUrl("");
      setPrice("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error adding item");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center pt-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-brand" />
            Añadir producto
          </CardTitle>
          <p className="text-sm text-zinc-400">
            Añade un producto de AliExpress copiando su enlace.
          </p>
        </CardHeader>
        <CardContent>
          {success && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-700">
              <CheckCircle className="h-4 w-4" /> Producto añadido correctamente
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="url">Link de AliExpress *</Label>
              <Input
                id="url"
                type="url"
                placeholder="https://es.aliexpress.com/item/..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="title">Nombre del producto *</Label>
              <Input
                id="title"
                placeholder="ej. Auriculares Bluetooth"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                maxLength={200}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="imageUrl">Imagen (URL)</Label>
                <Input
                  id="imageUrl"
                  type="url"
                  placeholder="https://..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="price">Precio</Label>
                <Input
                  id="price"
                  placeholder="ej. 12,99 €"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>
            </div>
            {error && (
              <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>
            )}
            <Button type="submit" disabled={loading}>
              <Send className="h-4 w-4" />
              {loading ? "Añadiendo..." : "Añadir a la lista"}
            </Button>
            <p className="text-center text-xs text-zinc-400">
              Los enlaces deben ser de AliExpress.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
