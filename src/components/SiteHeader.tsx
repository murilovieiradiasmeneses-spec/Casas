import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function SiteHeader() {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSignedIn(!!s));
    return () => data.subscription.unsubscribe();
  }, []);
  const link = "text-sm text-muted-foreground transition-colors hover:text-foreground";
  return (
    <header className="sticky top-0 z-[1100] border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-8">
        <Link to="/" className="font-display text-2xl font-semibold tracking-[0.25em]">CASAS</Link>
        <nav className="flex items-center gap-4 md:gap-8">
          <Link to="/imoveis" className={link} activeProps={{ className: "text-foreground" }}>Explorar<span className="hidden sm:inline"> imóveis</span></Link>
          <Link to="/mapa" className={link} activeProps={{ className: "text-foreground" }}>Mapa</Link>
          {signedIn ? (
            <Link to="/painel" className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-secondary">Painel</Link>
          ) : (
            <Link to="/entrar" className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-secondary">Entrar</Link>
          )}
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t bg-charcoal text-charcoal-foreground">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-10 text-sm md:flex-row md:items-center md:justify-between md:px-8">
        <span className="font-display text-xl tracking-[0.25em]">CASAS</span>
        <span className="opacity-70">Vitrine de imóveis selecionados · © {new Date().getFullYear()}</span>
      </div>
    </footer>
  );
}
