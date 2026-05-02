import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { apiFetch } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ExternalLink, Gift, ShoppingBag } from "lucide-react";

interface Item {
  id: number;
  title: string;
  url: string;
  imageUrl: string;
  price: string;
  purchased: boolean;
  createdAt: string;
}

interface Wishlist {
  id: number;
  title: string;
  description: string;
  editSlug: string;
  items: Item[];
}

export default function WishlistViewPage() {
  const { slug } = useParams<{ slug: string }>();
  const [wishlist, setWishlist] = useState<Wishlist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch(`/wishlists/s/${slug}`)
      .then((res) => res.json())
      .then(setWishlist)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-brand border-t-transparent" />
      </div>
    );
  }

  if (error || !wishlist) {
    return (
      <div className="flex flex-col items-center gap-4 py-16">
        <p className="text-zinc-500">Lista no encontrada</p>
        <Link to="/">
          <Button variant="outline">Volver al inicio</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <Gift className="h-6 w-6 text-brand" />
          <h1 className="text-2xl font-bold">{wishlist.title}</h1>
        </div>
        {wishlist.description && (
          <p className="text-zinc-500">{wishlist.description}</p>
        )}
        <Link
          to={`/w/${wishlist.editSlug}/add`}
          className="self-start"
        >
          <Button variant="outline" size="sm">
            + Añadir producto
          </Button>
        </Link>
      </div>

      {/* Items grid */}
      {wishlist.items.length === 0 ? (
        <Card className="py-12 text-center">
          <p className="text-zinc-400">Esta lista está vacía</p>
          <p className="mt-1 text-sm text-zinc-300">
            Comparte el enlace de edición para que otros añadan productos
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {wishlist.items.map((item) => (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group block"
            >
              <Card className={`overflow-hidden ${item.purchased ? "opacity-50" : ""}`}>
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="h-40 w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-40 items-center justify-center bg-surface">
                    <ShoppingBag className="h-12 w-12 text-zinc-300" />
                  </div>
                )}
                <div className="p-4">
                  <h3 className="font-semibold group-hover:text-brand transition-colors line-clamp-2">
                    {item.title}
                  </h3>
                  <div className="mt-2 flex items-center justify-between">
                    {item.price && (
                      <span className="text-lg font-bold text-brand">
                        {item.price}
                      </span>
                    )}
                    <ExternalLink className="h-3.5 w-3.5 text-zinc-300 group-hover:text-brand transition-colors" />
                  </div>
                  {item.purchased && (
                    <span className="mt-1 inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                      Comprado
                    </span>
                  )}
                </div>
              </Card>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
