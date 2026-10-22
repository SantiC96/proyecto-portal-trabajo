import type { Metadata } from "next";
import { logError } from "@/lib/logger";
import Link from "next/link";
import {
  BookOpen,
  Briefcase,
  Building2,
  ChartColumn,
  ChevronRight,
  ClipboardList,
  House,
  UserCog,
  Users,
} from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { UMBRAL_RECHAZOS_CURSO } from "@/lib/cursos";
import { requerirRolPagina } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Panel municipal | Portal de Empleo Funes",
};

function textoEstado(hayPendientes: boolean): string {
  return hayPendientes
    ? "text-sm font-medium text-warning-text"
    : "text-sm text-muted-foreground";
}

export default async function AdminDashboardPage() {
  await requerirRolPagina("municipalidad");
  const supabase = await createSupabaseServerClient();

  const [
    { count: postulacionesPendientes },
    { count: totalPostulantes },
    { count: ofertasPendientes },
    esperandoCursoRes,
    { count: cursosActivos },
    { count: comprobantesPendientes },
  ] = await Promise.all([
    supabase
      .from("postulaciones")
      .select("*", { count: "exact", head: true })
      .in("estado", ["recibida", "en_revision"]),
    supabase.from("postulantes").select("*", { count: "exact", head: true }),
    supabase
      .from("ofertas")
      .select("*", { count: "exact", head: true })
      .eq("estado", "pendiente_aprobacion"),
    supabase.rpc("contar_postulantes_esperando_curso"),
    supabase
      .from("cursos")
      .select("*", { count: "exact", head: true })
      .eq("activo", true),
    supabase
      .from("archivos_usuario")
      .select("id", { count: "exact", head: true })
      .eq("tipo", "comprobante_domicilio")
      .is("eliminado_en", null)
      .eq("verificacion_estado", "pendiente"),
  ]);
  const comprobantes = comprobantesPendientes ?? 0;

  if (esperandoCursoRes.error)
    logError("contar_postulantes_esperando_curso", esperandoCursoRes.error);
  const postulantesEsperando = Number(esperandoCursoRes.data ?? 0);

  return (
    <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        Panel de la Oficina de Empleo
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Revisá empresas, postulaciones y postulantes, y consultá los indicadores del portal.
      </p>

      <div className="mt-8 space-y-3">
        <Link
          href="/admin/ofertas"
          className="flex items-center justify-between rounded-[var(--radius-lg)] border border-border bg-surface p-5 transition-colors hover:bg-surface-tinted"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-primary">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Ofertas</p>
              <p className={textoEstado((ofertasPendientes ?? 0) > 0)}>
                {(ofertasPendientes ?? 0) > 0
                  ? `${ofertasPendientes} oferta${ofertasPendientes === 1 ? "" : "s"} pendiente${ofertasPendientes === 1 ? "" : "s"} de revisión`
                  : "Revisá y publicá las ofertas enviadas por las empresas"}
              </p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 flex-shrink-0 text-muted-icon" />
        </Link>

        <Link
          href="/admin/empresas"
          className="flex items-center justify-between rounded-[var(--radius-lg)] border border-border bg-surface p-5 transition-colors hover:bg-surface-tinted"
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

        <Link
          href="/admin/postulaciones"
          className="flex items-center justify-between rounded-[var(--radius-lg)] border border-border bg-surface p-5 transition-colors hover:bg-surface-tinted"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-primary">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Postulaciones</p>
              <p className={textoEstado((postulacionesPendientes ?? 0) > 0)}>
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
              <p className={textoEstado(postulantesEsperando > 0)}>
                {(totalPostulantes ?? 0) === 0
                  ? "Buscá candidatos por rubro y revisá sus CVs"
                  : `${totalPostulantes ?? 0} registrado${
                      totalPostulantes === 1 ? "" : "s"
                    } · ${postulantesEsperando} con ${UMBRAL_RECHAZOS_CURSO} o más rechazos`}
              </p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 flex-shrink-0 text-muted-icon" />
        </Link>

        <Link
          href="/admin/comprobantes"
          className="flex items-center justify-between rounded-[var(--radius-lg)] border border-border bg-surface p-5 transition-colors hover:bg-surface-tinted"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-primary">
              <House className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Comprobantes por revisar</p>
              <p className={textoEstado(comprobantes > 0)}>
                {comprobantes > 0
                  ? `${comprobantes} comprobante${comprobantes === 1 ? "" : "s"} de domicilio en Funes pendiente${comprobantes === 1 ? "" : "s"}`
                  : "No hay comprobantes de domicilio pendientes"}
              </p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 flex-shrink-0 text-muted-icon" />
        </Link>

        <Link
          href="/admin/cursos"
          className="flex items-center justify-between rounded-[var(--radius-lg)] border border-border bg-surface p-5 transition-colors hover:bg-surface-tinted"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-primary">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Cursos</p>
              <p className="text-sm text-muted-foreground">
                {(cursosActivos ?? 0) > 0
                  ? `${cursosActivos} curso${cursosActivos === 1 ? "" : "s"} activo${cursosActivos === 1 ? "" : "s"}`
                  : "Gestioná los cursos de inserción laboral"}
              </p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 flex-shrink-0 text-muted-icon" />
        </Link>

        <Link
          href="/admin/indicadores"
          className="flex items-center justify-between rounded-[var(--radius-lg)] border border-border bg-surface p-5 transition-colors hover:bg-surface-tinted"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-primary">
              <ChartColumn className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Indicadores</p>
              <p className="text-sm text-muted-foreground">
                Postulaciones, derivaciones, contrataciones y cursos por período
              </p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 flex-shrink-0 text-muted-icon" />
        </Link>

        <Link
          href="/admin/cuentas"
          className="flex items-center justify-between rounded-[var(--radius-lg)] border border-border bg-surface p-5 transition-colors hover:bg-surface-tinted"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-primary">
              <UserCog className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Cuentas de la oficina</p>
              <p className="text-sm text-muted-foreground">
                Invitá, desactivá o reactivá las cuentas del personal de la oficina
              </p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 flex-shrink-0 text-muted-icon" />
        </Link>
      </div>
    </section>
  );
}
