import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Building2, ArrowUpRight, MapPinned } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function SiteHeader() {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSignedIn(!!s));
    return () => data.subscription.unsubscribe();
  }, []);
  const link = "rounded-xl px-3.5 py-2 text-sm font-semibold text-muted-foreground transition-all hover:bg-secondary hover:text-foreground";
  return (
    <header className="sticky top-0 z-[1100] border-b border-border/70 bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex min-h-[76px] max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-8">
        <Link to="/" aria-label="CASAS — página inicial" className="group inline-flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-charcoal text-charcoal-foreground shadow-md transition-transform group-hover:-rotate-6"><Building2 className="h-5 w-5" strokeWidth={1.8} /></span>
          <span className="font-display text-[21px] font-bold tracking-[-0.065em]">CASAS<span className="text-primary">.</span></span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link to="/imoveis" className={link} activeProps={{ className: "text-foreground" }}>Explorar<span className="hidden sm:inline"> imóveis</span></Link>
          <Link to="/mapa" className={link} activeProps={{ className: "text-foreground" }}><MapPinned className="mr-1 inline h-4 w-4" /><span className="hidden sm:inline">Mapa</span></Link>
          {signedIn ? (
            <Link to="/painel" className="inline-flex items-center gap-1.5 rounded-xl bg-charcoal px-4 py-2.5 text-sm font-semibold text-charcoal-foreground transition-all hover:-translate-y-px hover:shadow-md">Painel <ArrowUpRight className="h-4 w-4" /></Link>
          ) : (
            <Link to="/entrar" className="inline-flex items-center gap-1.5 rounded-xl bg-charcoal px-4 py-2.5 text-sm font-semibold text-charcoal-foreground transition-all hover:-translate-y-px hover:shadow-md">Entrar <ArrowUpRight className="h-4 w-4" /></Link>
          )}
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 bg-charcoal text-charcoal-foreground">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-12 text-sm md:flex-row md:items-center md:justify-between md:px-8">
        <span className="font-display text-2xl font-bold tracking-[-0.055em]">CASAS<span className="text-primary">.</span></span>
        <span className="opacity-70">Vitrine de imóveis selecionados · © {new Date().getFullYear()}</span>
      </div>
    </footer>
  );
}
