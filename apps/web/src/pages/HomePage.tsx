import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Gift, Share2, Smartphone, Sparkles } from "lucide-react";

const features = [
  {
    icon: Gift,
    title: "Crea listas de deseos",
    desc: "Organiza todo lo que quieres comprar en listas temáticas. Fácil y rápido.",
  },
  {
    icon: Share2,
    title: "Comparte con un link",
    desc: "Cada lista tiene un enlace público. Cualquiera puede verla o añadir productos.",
  },
  {
    icon: Smartphone,
    title: "Optimizado para móvil",
    desc: "Diseñado para funcionar perfectamente en cualquier dispositivo.",
  },
];

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="flex flex-col items-center gap-12 pt-4">
      {/* Hero */}
      <section className="flex flex-col items-center gap-6 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-4 py-1.5 text-sm font-medium text-brand">
          <Sparkles className="h-3.5 w-3.5" /> Colaborativo y gratuito
        </div>
        <h1 className="max-w-2xl text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
          Listas de deseos{" "}
          <span className="bg-gradient-to-r from-brand to-brand-light bg-clip-text text-transparent">
            colaborativas
          </span>
        </h1>
        <p className="max-w-lg text-lg text-zinc-500">
          Crea listas de deseos para cualquier ocasión. Comparte el enlace y deja que
          tus amigos y familiares añadan lo que quieran regalarte.
        </p>
        <div className="flex gap-3">
          {user ? (
            <>
              <Link to="/dashboard">
                <Button size="lg">Mis listas</Button>
              </Link>
              <Link to="/wishlists/new">
                <Button variant="outline" size="lg">
                  Crear nueva lista
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Link to="/register">
                <Button size="lg">Empieza ahora</Button>
              </Link>
              <Link to="/login">
                <Button variant="outline" size="lg">
                  Iniciar sesión
                </Button>
              </Link>
            </>
          )}
        </div>
      </section>

      {/* Features */}
      <section className="grid gap-6 sm:grid-cols-3">
        {features.map((f) => (
          <div
            key={f.title}
            className="flex flex-col items-center gap-3 rounded-2xl bg-white p-6 text-center shadow-sm"
          >
            <div className="rounded-xl bg-brand/10 p-3">
              <f.icon className="h-6 w-6 text-brand" />
            </div>
            <h3 className="font-bold">{f.title}</h3>
            <p className="text-sm text-zinc-400">{f.desc}</p>
          </div>
        ))}
      </section>

      {/* CTA */}
      <section className="w-full rounded-3xl bg-gradient-to-br from-brand to-brand-dark p-8 text-center text-white sm:p-12">
        <h2 className="text-2xl font-bold sm:text-3xl">
          ¿Listo para organizar tus deseos?
        </h2>
        <p className="mt-2 text-white/80">
          Regístrate gratis y empieza a crear listas colaborativas.
        </p>
        <div className="mt-6">
          {!user && (
            <Link to="/register">
              <Button
                size="lg"
                className="bg-white text-brand hover:bg-white/90"
              >
                Crear cuenta gratis
              </Button>
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
