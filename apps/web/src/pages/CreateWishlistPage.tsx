import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Gift } from "lucide-react";

export default function CreateWishlistPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await apiFetch("/wishlists", {
        method: "POST",
        body: JSON.stringify({ title, description }),
      });
      const data = await res.json();
      navigate(`/w/${data.slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error creating wishlist");
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
            Nueva lista de deseos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                placeholder="ej. Mi cumpleaños 🎂"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                maxLength={200}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="desc">Descripción</Label>
              <Input
                id="desc"
                placeholder="Una breve descripción..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
              />
            </div>
            {error && (
              <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>
            )}
            <Button type="submit" disabled={loading}>
              {loading ? "Creando..." : "Crear lista"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
