import { Routes, Route, Link } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Gift, LogOut, Plus, List } from "lucide-react";
import HomePage from "@/pages/HomePage";
import DashboardPage from "@/pages/DashboardPage";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import CreateWishlistPage from "@/pages/CreateWishlistPage";
import WishlistViewPage from "@/pages/WishlistViewPage";
import WishlistAddPage from "@/pages/WishlistAddPage";

export default function App() {
  const { user, logout, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-brand border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-zinc-100 bg-white/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2 text-xl font-bold">
            <Gift className="h-6 w-6 text-brand" />
            <span className="bg-gradient-to-r from-brand to-brand-light bg-clip-text text-transparent">
              WishCollab
            </span>
          </Link>

          <div className="flex items-center gap-2">
            {user ? (
              <>
                <Link to="/dashboard">
                  <Button variant="ghost" size="sm">
                    <List className="h-4 w-4" /> Mis listas
                  </Button>
                </Link>
                <Link to="/wishlists/new">
                  <Button size="sm">
                    <Plus className="h-4 w-4" /> Nueva lista
                  </Button>
                </Link>
                <Button variant="ghost" size="icon" onClick={logout} title="Logout">
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm">
                    Iniciar sesión
                  </Button>
                </Link>
                <Link to="/register">
                  <Button size="sm">Registrarse</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/wishlists/new" element={<CreateWishlistPage />} />
          <Route path="/w/:slug" element={<WishlistViewPage />} />
          <Route path="/w/:slug/add" element={<WishlistAddPage />} />
        </Routes>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-100 bg-white py-6 text-center text-sm text-zinc-400">
        Hecho con ❤️ · WishCollab &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
