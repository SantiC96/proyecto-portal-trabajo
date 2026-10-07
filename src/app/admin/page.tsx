import type { Metadata } from "next";
import Link from "next/link";
import { Building2, ChevronRight, ClipboardList, Users } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const metadata: Metadata = {
  title: "Panel municipal | Portal de Empleo Funes",
};

export default async function AdminDashboardPage() {
  const supabase = await createSupabaseServerClient();

  const [
    { count: pendientes },
    { count: aprobadas },
    { count: rechazadas },
    { count: postulacionesPendientes },
    { count: totalPostulantes },
    { count: postulantesConCv },
  ] = await Promise.all([
    supabase
      .from("empresas")
      .select("*", { count: "exact", head: true })
      .eq("estado_aprobacion", "pendiente"),
    supabase
      .from("empresas")
      .select("*", { count: "exact", head: true })
      .eq("estado_aprobacion", "aprobada"),
    supabase
      .from("empresas")
      .select("*", { count: "exact", head: true })
      .eq("estado_aprobacion", "rechazada"),
    supabase
      .from("postulaciones")
      .select("*", { count: "exact", head: true })
      .in("estado", ["recibida", "en_revision"]),
    supabase
      .from("postulantes")
      .select("*", { count: "exact", head: true }),
    supabase
      .from("archivos_usuario")
      .select("*", { count: "exact", head: true })
      .eq("tipo", "cv")
      .eq("activo", true),
  ]);

  return (
    <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        Panel de la Oficina de Empleo
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Revisá empresas, postulaciones y postulantes.
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
          <p className="mt-2 text-4xl font-bold text-red-600">
            {rechazadas ?? 0}
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <Link
          href="/admin/empresas"
          className="flex items-center justify-between rounded-[var(--radius-lg)] border border-border bg-surface p-5 transition-colors hover:bg-surface-tinted"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-primary">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="flex items-center gap-1.5 font-semibold text-foreground">
                Empresas
                {(pendientes ?? 0) > 0 && (
                  <span className="bg-primary text-white text-xs font-semibold rounded-full min-w-5 h-5 px-1.5 inline-flex items-center justify-center">
                    {pendientes}
                  </span>
                )}
              </p>
              <p className="text-sm text-muted-foreground">
                {(pendientes ?? 0) > 0
                  ? `${pendientes} empresa${pendientes === 1 ? "" : "s"} pendiente${pendientes === 1 ? "" : "s"} de revisión`
                  : "Revisá solicitudes pendientes y el historial de decisiones"}
              </p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 flex-shrink-0 text-muted-icon" />
        </Link>

        <Link
          href="/admin/postulaciones"
          className="flex items-center justify-between rounded-[var(--radius-lg)] border border-border bg-surface p-5 transition-colors hover:bg-surface-tinted"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-primary">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <p className="flex items-center gap-1.5 font-semibold text-foreground">
                Postulaciones
                {(postulacionesPendientes ?? 0) > 0 && (
                  <span className="bg-primary text-white text-xs font-semibold rounded-full min-w-5 h-5 px-1.5 inline-flex items-center justify-center">
                    {postulacionesPendientes}
                  </span>
                )}
              </p>
              <p className="text-sm text-muted-foreground">
                {(postulacionesPendientes ?? 0) > 0
                  ? `${postulacionesPendientes} pendiente${
                      postulacionesPendientes === 1 ? "" : "s"
                    } de revisión`
                  : "Revisá candidatos y gestioná derivaciones"}
              </p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 flex-shrink-0 text-muted-icon" />
        </Link>

        <Link
          href="/admin/postulantes"
          className="flex items-center justify-between rounded-[var(--radius-lg)] border border-border bg-surface p-5 transition-colors hover:bg-surface-tinted"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-primary">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Postulantes</p>
              <p className="text-sm text-muted-foreground">
                {(totalPostulantes ?? 0) === 0
                  ? "Buscá candidatos por rubro y revisá sus CVs"
                  : `${totalPostulantes ?? 0} registrado${
                      totalPostulantes === 1 ? "" : "s"
                    } · ${postulantesConCv ?? 0} con CV`}
              </p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 flex-shrink-0 text-muted-icon" />
        </Link>
      </div>
    </section>
  );
}
