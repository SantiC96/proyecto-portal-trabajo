import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Badge, claseTextoTono } from "@/components/ui/badge";
import { BarraProgreso } from "@/components/ui/barra-progreso";
import { Esqueleto, EsqueletoTarjeta } from "@/components/ui/esqueleto";
import { badgePostulacion } from "@/lib/mis-postulaciones";
import { logError } from "@/lib/logger";
import { cn } from "@/lib/utils";
import {
  obtenerCompletitudPerfil,
  obtenerIndicadoresPostulante,
  obtenerInvitacionesPendientes,
  obtenerUltimosMovimientos,
} from "@/lib/postulante/panel";
import { textoInvitacionReciente } from "@/lib/invitaciones";

const ULTIMAS_POSTULACIONES = 2;

// Columnas según cuántas tarjetas hay: las que no aparecen dejan su lugar.
const COLUMNAS: Record<number, string> = {
  1: "",
  2: "@3xl:grid-cols-2",
  3: "@3xl:grid-cols-2 @5xl:grid-cols-3",
};

/**
 * Resumen del postulante en el inicio, con los mismos datos que el panel
 * (src/lib/postulante/panel.ts): postulaciones, invitaciones pendientes y qué
 * le falta al perfil.
 */
export async function TuActividad({ postulanteId }: { postulanteId: string }) {
  const [indicadores, movimientos, invitaciones, perfil] = await Promise.all([
    obtenerIndicadoresPostulante(),
    obtenerUltimosMovimientos(postulanteId),
    obtenerInvitacionesPendientes(),
    obtenerCompletitudPerfil(),
  ]);

  if (!indicadores.data) logError("inicio:tu_actividad:indicadores", indicadores.error);
  if (!movimientos.data) logError("inicio:tu_actividad:movimientos", movimientos.error);
  if (!perfil.data) logError("inicio:tu_actividad:perfil", perfil.error);

  const cantidadInvitaciones = indicadores.data?.invitaciones_pendientes ?? 0;
  const mostrarInvitaciones = cantidadInvitaciones > 0;
  const mostrarPerfil = (perfil.data?.pendientes.length ?? 0) > 0;
  const tarjetas = 1 + Number(mostrarInvitaciones) + Number(mostrarPerfil);

  return (
    <section aria-labelledby="tu-actividad-titulo" className="@container">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <h2 id="tu-actividad-titulo" className="text-[26px] leading-tight font-extrabold">
          Tu actividad
        </h2>
        <Link
          href="/panel"
          className="inline-flex min-h-11 items-center gap-1 rounded-[var(--radius-md)] text-[15px] font-bold text-primary outline-none hover:underline focus-visible:shadow-[var(--sombra-foco)]"
        >
          Ir a mi panel
          <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      </div>

      <div className={cn("mt-5 grid grid-cols-1 gap-4", COLUMNAS[tarjetas])}>
        <article className="tarjeta flex flex-col gap-4 p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-extrabold">Tus postulaciones</h3>
            {indicadores.data && (
              <Badge tono="success">
                {indicadores.data.postulaciones_activas === 1
                  ? "1 activa"
                  : `${indicadores.data.postulaciones_activas} activas`}
              </Badge>
            )}
          </div>

          {!movimientos.data ? (
            <p className="text-sm text-muted-foreground">
              No pudimos cargar tus postulaciones. Intentá de nuevo en unos minutos.
            </p>
          ) : movimientos.data.length === 0 ? (
            <p className="text-[15px] text-muted-foreground">
              Todavía no te postulaste a ninguna oferta.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {movimientos.data.slice(0, ULTIMAS_POSTULACIONES).map((m) => {
                const badge = badgePostulacion({
                  estado: m.estado,
                  estadoEmpresa: m.estadoEmpresa,
                  ofertaEstado: m.ofertaEstado,
                  ofertaNoVisible: m.ofertaNoVisible,
                });
                return (
                  <li key={m.postulacionId} className="min-w-0">
                    <p className="truncate text-[15px] font-bold text-foreground" title={m.oferta.titulo}>
                      {m.oferta.titulo}
                    </p>
                    <p className={cn("text-sm font-semibold", claseTextoTono(badge.tono))}>
                      {badge.label}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}

          <Link href="/mis-postulaciones" className="btn-secundario mt-auto self-start">
            Ver mis postulaciones
          </Link>
        </article>

        {mostrarInvitaciones && (
          <article className="flex flex-col gap-4 rounded-[var(--radius-xl)] border-2 border-accent bg-surface p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-lg font-extrabold text-invitacion-titulo">Invitaciones</h3>
              <Badge tono="warning">
                {cantidadInvitaciones === 1 ? "1 pendiente" : `${cantidadInvitaciones} pendientes`}
              </Badge>
            </div>
            {invitaciones.data && invitaciones.data.length > 0 && (
              <p className="text-[15px] leading-[1.45] text-invitacion-texto">
                {textoInvitacionReciente(invitaciones.data[0], cantidadInvitaciones)}
              </p>
            )}
            <Link href="/invitaciones" className="btn-oscuro mt-auto self-start">
              Ver invitaciones
            </Link>
          </article>
        )}

        {mostrarPerfil && perfil.data && (
          <article className="tarjeta flex flex-col gap-4 p-6">
            <h3 className="text-lg font-extrabold">Completá tu perfil</h3>
            <div className="flex items-center gap-3">
              <BarraProgreso
                porcentaje={perfil.data.porcentaje}
                etiqueta={`Perfil completo al ${perfil.data.porcentaje}%`}
              />
              <span aria-hidden="true" className="shrink-0 text-sm font-bold text-foreground">
                {perfil.data.porcentaje}%
              </span>
            </div>
            <p className="text-[15px] leading-[1.45] text-muted-foreground-strong">
              {perfil.data.pendientes[0].texto}
            </p>
            <Link href={perfil.data.pendientes[0].href} className="btn-secundario mt-auto self-start">
              Completar perfil
            </Link>
          </article>
        )}
      </div>
    </section>
  );
}

export function EsqueletoTuActividad() {
  return (
    <div aria-busy="true" aria-label="Cargando tu actividad">
      <Esqueleto className="h-8 w-44" />
      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
        <EsqueletoTarjeta />
        <EsqueletoTarjeta className="hidden md:block" />
      </div>
    </div>
  );
}
