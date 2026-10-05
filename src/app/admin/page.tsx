import type { Metadata } from "next";
import Link from "next/link";
import { Building2, ChevronRight } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const metadata: Metadata = {
  title: "Panel municipal | Portal de Empleo Funes",
};

export default async function AdminDashboardPage() {
  const [{ count: pendientes }, { count: aprobadas }, { count: rechazadas }] =
    await Promise.all([
      supabaseAdmin
        .from("empresas")
        .select("*", { count: "exact", head: true })
        .eq("estado_aprobacion", "pendiente"),
      supabaseAdmin
        .from("empresas")
        .select("*", { count: "exact", head: true })
        .eq("estado_aprobacion", "aprobada"),
      supabaseAdmin
        .from("empresas")
        .select("*", { count: "exact", head: true })
        .eq("estado_aprobacion", "rechazada"),
    ]);

  return (
    <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        Panel de la Oficina de Empleo
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Revisá y gestioná los registros de empresas.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-6">
          <p className="text-sm font-medium text-muted-foreground">Pendientes</p>
          <p className="mt-2 text-4xl font-bold text-foreground">
            {pendientes ?? 0}
          </p>
        </div>
        <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-6">
          <p className="text-sm font-medium text-muted-foreground">Aprobadas</p>
          <p className="mt-2 text-4xl font-bold text-primary">
            {aprobadas ?? 0}
          </p>
        </div>
        <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-6">
          <p className="text-sm font-medium text-muted-foreground">Rechazadas</p>
          <p className="mt-2 text-4xl font-bold text-destructive">
            {rechazadas ?? 0}
          </p>
        </div>
      </div>

      <Link
        href="/admin/empresas"
        className="mt-6 flex items-center justify-between rounded-[var(--radius-lg)] border border-border bg-surface p-5 transition-colors hover:bg-surface-tinted"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-primary">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Empresas</p>
            <p className="text-sm text-muted-foreground">
              Revisá solicitudes pendientes y el historial de decisiones
            </p>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 flex-shrink-0 text-muted-icon" />
      </Link>
    </section>
  );
}
