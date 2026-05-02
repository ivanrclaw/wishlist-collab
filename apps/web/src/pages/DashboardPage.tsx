import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { apiFetch } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Plus, ExternalLink, Copy, Trash2, Pencil } from "lucide-react";

interface Wishlist {
  id: number;
  title: string;
  description: string;
  slug: string;
  editSlug: string;
  createdAt: string;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [wishlists, setWishlists] = useState<Wishlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    apiFetch("/wishlists")
      .then((res) => res.json())
      .then(setWishlists)
      .finally(() => setLoading(false));
  }, [user, navigate]);

  const copyLink = (slug: string, editSlug: string) => {
    const url = `${window.location.origin}/w/${slug}`;
    navigator.clipboard.writeText(url);
    setCopied(slug);
    setTimeout(() => setCopied(null), 2000);
  };

  const copyEditLink = (editSlug: string) => {
    const url = `${window.location.origin}/w/${editSlug}/add`;
    navigator.clipboard.writeText(url);
    setCopied(editSlug);
    setTimeout(() => setCopied(null), 2000);
  };

  const deleteList = async (id: number) => {
    if (!confirm("¿Eliminar esta lista? Esta acción no se puede deshacer.")) return;
    await apiFetch(`/wishlists/${id}`, { method: "DELETE" });
    setWishlists((prev) => prev.filter((w) => w.id !== id));
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-brand border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mis listas de deseos</h1>
        <Link to="/wishlists/new">
          <Button>
            <Plus className="h-4 w-4" /> Nueva lista
          </Button>
        </Link>
      </div>

      {wishlists.length === 0 ? (
        <Card>
          <CardContent>
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <p className="text-zinc-500">Aún no has creado ninguna lista</p>
              <Link to="/wishlists/new">
                <Button variant="outline">Crear mi primera lista</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {wishlists.map((w) => (
            <Card key={w.id}>
              <CardHeader>
                <CardTitle>{w.title}</CardTitle>
                {w.description && (
                  <p className="text-sm text-zinc-400">{w.description}</p>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Link to={`/w/${w.slug}`}>
                    <Button variant="outline" size="sm">
                      <ExternalLink className="h-3.5 w-3.5" /> Ver
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyLink(w.slug, w.editSlug)}
                  >
                    <Copy className="h-3.5 w-3.5" />{" "}
                    {copied === w.slug ? "¡Copiado!" : "Link vista"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyEditLink(w.editSlug)}
                  >
                    <Copy className="h-3.5 w-3.5" />{" "}
                    {copied === w.editSlug ? "¡Copiado!" : "Link añadir"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteList(w.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
