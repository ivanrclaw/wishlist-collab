import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import AddItemModal from "@/components/AddItemModal";
import { ExternalLink, Gift, ShoppingBag, Plus } from "lucide-react";

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
  const queryClient = useQueryClient();
  const [wishlist, setWishlist] = useState<Wishlist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const fetchWishlist = () => {
    setLoading(true);
    apiFetch(`/wishlists/s/${slug}`)
      .then((res) => res.json())
      .then(setWishlist)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchWishlist();
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
    <>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <Gift className="h-6 w-6 text-brand" />
            <h1 className="text-2xl font-bold">{wishlist.title}</h1>
          </div>
          {wishlist.description && (
            <p className="text-zinc-500 dark:text-zinc-400">{wishlist.description}</p>
          )}
          <Button
            className="self-start"
            onClick={() => setModalOpen(true)}
          >
            <Plus className="h-4 w-4" /> Añadir producto
          </Button>
        </div>

        {/* Items grid */}
        {wishlist.items.length === 0 ? (
          <Card className="py-12 text-center">
            <ShoppingBag className="mx-auto h-12 w-12 text-zinc-300 dark:text-zinc-600" />
            <p className="mt-3 text-zinc-500 dark:text-zinc-400">
              Esta lista está vacía
            </p>
            <p className="mt-1 text-sm text-zinc-400 dark:text-zinc-500">
              Comparte el enlace para que otros añadan productos, o añade tú mismo
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
                <Card
                  className={`overflow-hidden transition-all hover:-translate-y-1 ${
                    item.purchased ? "opacity-50" : ""
                  }`}
                >
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="h-40 w-full object-contain bg-white p-2"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
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
                      <span className="mt-1 inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
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

      {/* Add Item Modal */}
      {wishlist.editSlug && (
        <AddItemModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          editSlug={wishlist.editSlug}
          onAdded={fetchWishlist}
        />
      )}
    </>
  );
}
