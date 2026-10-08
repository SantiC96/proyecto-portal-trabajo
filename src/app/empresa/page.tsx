import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, Plus, List } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const metadata: Metadata = {
  title: "Panel de empresa | Portal de Empleo Funes",
};

export default async function EmpresaDashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: empresa } = await supabase
    .from("empresas")
    .select("id, razon_social")
    .eq("usuario_id", user.id)
    .maybeSingle();

  if (!empresa) redirect("/");

  // Conteo de ofertas por estado
  const estados = ["pendiente_aprobacion", "activa", "rechazada", "cerrada"] as const;
  const conteoResults = await Promise.all(
    estados.map((estado) =>
      supabase
        .from("ofertas")
        .select("*", { count: "exact", head: true })
        .eq("empresa_id", empresa.id)
        .eq("estado", estado)
    )
  );

  const conteos: Record<string, number> = {};
  estados.forEach((estado, i) => {
    conteos[estado] = conteoResults[i].count ?? 0;
  });

  const ESTADO_LABEL: Record<string, string> = {
    pendiente_aprobacion: "En revisión",
    activa: "Publicadas",
    rechazada: "Rechazadas",
    cerrada: "Cerradas",
  };

  return (
    <section className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Building2 className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            {empresa.razon_social}
          </h1>
          <p className="text-sm text-muted-foreground">Panel de empresa</p>
        </div>
      </div>

      {/* Resumen de ofertas */}
      <div className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Tus ofertas
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {estados.map((estado) => (
            <div
              key={estado}
              className="rounded-[var(--radius-lg)] border border-border bg-white p-4 text-center shadow-xs"
            >
              <p className="text-3xl font-bold text-foreground">{conteos[estado]}</p>
              <p className="mt-1 text-xs text-muted-foreground">{ESTADO_LABEL[estado]}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Accesos rápidos */}
      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Link
          href="/empresa/ofertas"
          className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-border bg-white p-5 shadow-xs transition hover:border-primary/40 hover:bg-surface-tinted"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-primary">
            <List className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Mis ofertas</p>
            <p className="text-xs text-muted-foreground">Ver y gestionar tus publicaciones</p>
          </div>
        </Link>

        <Link
          href="/empresa/ofertas/nueva"
          className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-border bg-white p-5 shadow-xs transition hover:border-primary/40 hover:bg-surface-tinted"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-primary">
            <Plus className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Publicar oferta</p>
            <p className="text-xs text-muted-foreground">Crear una nueva oferta laboral</p>
          </div>
        </Link>
      </div>
    </section>
  );
}
