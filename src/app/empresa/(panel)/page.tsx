import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Building2, Plus, List, BookmarkCheck, AlertTriangle, ChartColumn } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requerirEmpresaPagina } from "@/lib/auth";
import { AvisoUrl } from "@/components/ui/aviso-url";
import { CandidatosSinResultado } from "./_components/candidatos-sin-resultado";
import { DIAS_AVISO_VENCIMIENTO } from "@/lib/ofertas-vencimiento";
import { generarAvisosVencimientoEmpresa } from "@/lib/notificaciones";
import { dentroDeDiasISO } from "@/lib/fechas";

export const metadata: Metadata = {
  title: "Panel de empresa | Portal de Empleo Funes",
};

export default async function EmpresaDashboardPage() {
  const empresa = await requerirEmpresaPagina();
  const supabase = await createSupabaseServerClient();

  // Sin cron: los avisos de vencimiento se generan al entrar al panel. Antes
  // del render, para que la campanita ya los cuente.
  await generarAvisosVencimientoEmpresa();

  // Conteo de ofertas por estado. Una oferta activa con vence_en vencido se
  // cuenta como "Vencida": sigue en estado 'activa' pero ya no se ve en el portal.
  const ahora = dentroDeDiasISO(0);
  const enDiasAviso = dentroDeDiasISO(DIAS_AVISO_VENCIMIENTO);
  const contar = () =>
    supabase
      .from("ofertas")
      .select("*", { count: "exact", head: true })
      .eq("empresa_id", empresa.id)
      .is("eliminada_en", null);
  const [pendientes, publicadas, vencidas, rechazadas, cerradas, porVencer] = await Promise.all([
    contar().eq("estado", "pendiente_aprobacion"),
    contar().eq("estado", "activa").gt("vence_en", ahora),
    contar().eq("estado", "activa").lte("vence_en", ahora),
    contar().eq("estado", "rechazada"),
    contar().eq("estado", "cerrada"),
    contar().eq("estado", "activa").gt("vence_en", ahora).lte("vence_en", enDiasAviso),
  ]);

  const resumen = [
    { clave: "pendiente_aprobacion", label: "En revisión", cantidad: pendientes.count ?? 0 },
    { clave: "activa", label: "Publicadas", cantidad: publicadas.count ?? 0 },
    { clave: "vencida", label: "Vencidas", cantidad: vencidas.count ?? 0 },
    { clave: "rechazada", label: "Rechazadas", cantidad: rechazadas.count ?? 0 },
    { clave: "cerrada", label: "Cerradas", cantidad: cerradas.count ?? 0 },
  ];
  const cantidadVencidas = vencidas.count ?? 0;
  const cantidadPorVencer = porVencer.count ?? 0;

  return (
    <section className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <Suspense>
        <AvisoUrl />
      </Suspense>
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

      <Suspense fallback={null}>
        <CandidatosSinResultado />
      </Suspense>

      {/* Resumen de ofertas */}
      <div className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Tus ofertas
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {resumen.map((item) => (
            <div
              key={item.clave}
              className="rounded-[var(--radius-lg)] border border-border bg-white p-4 text-center shadow-xs"
            >
              <p className="text-3xl font-bold text-foreground">{item.cantidad}</p>
              <p className="mt-1 text-xs text-muted-foreground">{item.label}</p>
            </div>
          ))}
        </div>

        {(cantidadVencidas > 0 || cantidadPorVencer > 0) && (
          <Link
            href="/empresa/ofertas"
            className="mt-3 flex items-start gap-3 rounded-[var(--radius-lg)] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 transition hover:bg-amber-100"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              {cantidadVencidas > 0 &&
                `${cantidadVencidas === 1 ? "Tenés 1 oferta vencida" : `Tenés ${cantidadVencidas} ofertas vencidas`} que ya no se ${cantidadVencidas === 1 ? "ve" : "ven"} en el portal. `}
              {cantidadPorVencer > 0 &&
                `${cantidadPorVencer === 1 ? "1 oferta vence" : `${cantidadPorVencer} ofertas vencen`} en los próximos ${DIAS_AVISO_VENCIMIENTO} días. `}
              <span className="font-semibold underline-offset-2 hover:underline">
                {cantidadVencidas > 0 ? "Renovalas desde Mis ofertas" : "Ver mis ofertas"}
              </span>
            </span>
          </Link>
        )}
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

        <Link
          href="/empresa/candidatos-guardados"
          className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-border bg-white p-5 shadow-xs transition hover:border-primary/40 hover:bg-surface-tinted"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-primary">
            <BookmarkCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Candidatos guardados</p>
            <p className="text-xs text-muted-foreground">Perfiles para futuras búsquedas</p>
          </div>
        </Link>

        <Link
          href="/empresa/indicadores"
          className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-border bg-white p-5 shadow-xs transition hover:border-primary/40 hover:bg-surface-tinted"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-primary">
            <ChartColumn className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Indicadores</p>
            <p className="text-xs text-muted-foreground">Derivaciones, entrevistas y vacantes cubiertas</p>
          </div>
        </Link>
      </div>
    </section>
  );
}
