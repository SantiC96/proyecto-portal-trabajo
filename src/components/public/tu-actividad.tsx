import Link from "next/link";
import {
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock3,
  Mail,
  Send,
} from "lucide-react";
import { Badge, claseTextoTono } from "@/components/ui/badge";
import { BarraProgreso } from "@/components/ui/barra-progreso";
import { Esqueleto, EsqueletoTarjeta } from "@/components/ui/esqueleto";
import { EstadoVacioPostulaciones } from "@/components/public/estado-vacio-postulaciones";
import { badgePostulacion } from "@/lib/mis-postulaciones";
import { formatFecha } from "@/lib/fechas";
import { logError } from "@/lib/logger";
import { cn } from "@/lib/utils";
import {
  obtenerCompletitudPerfil,
  obtenerIndicadoresPostulante,
  obtenerInvitacionesPendientes,
  obtenerNotificacionesNoLeidasPostulante,
  obtenerUltimosMovimientos,
  type Movimiento,
} from "@/lib/postulante/panel";
import type { FilaMiInvitacion } from "@/types/db";

const ULTIMAS_POSTULACIONES = 2;

function EncabezadoTuActividad() {
  return (
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
  );
}

function EncabezadoPostulaciones({ activas }: { activas: number | null }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="text-lg font-extrabold">Últimas postulaciones</h3>
      {activas !== null && (
        <Badge tono={activas === 0 ? "neutral" : "success"}>
          {activas === 1 ? "1 activa" : `${activas} activas`}
        </Badge>
      )}
    </div>
  );
}

function ProgresoPostulacion({ movimiento }: { movimiento: Movimiento }) {
  const resultado =
    movimiento.estado === "rechazada_municipalidad" ||
    movimiento.estado === "retirada_postulante" ||
    movimiento.estado === "oferta_retirada" ||
    movimiento.estadoEmpresa === "contratado" ||
    movimiento.estadoEmpresa === "rechazado" ||
    movimiento.estadoEmpresa === "oferta_retirada";
  const etapa =
    resultado ? 2 : movimiento.estado === "recibida" ? 0 : movimiento.estado === "en_revision" ? 1 : 1;
  const pasos = ["Enviada", "En revisión", "Resultado"] as const;
  const badge = badgePostulacion({
    estado: movimiento.estado,
    estadoEmpresa: movimiento.estadoEmpresa,
    ofertaEstado: movimiento.ofertaEstado,
    ofertaNoVisible: movimiento.ofertaNoVisible,
  });

  return (
    <div className="flex flex-col gap-2.5">
      <p className={cn("flex items-center gap-1.5 text-sm font-semibold", claseTextoTono(badge.tono))}>
        {etapa === 0 ? (
          <Send className="size-4 shrink-0" aria-hidden="true" />
        ) : etapa === 1 ? (
          <Clock3 className="size-4 shrink-0" aria-hidden="true" />
        ) : (
          <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
        )}
        {badge.label}
      </p>

      <ol
        aria-label={`Etapa actual: ${pasos[etapa]}`}
        className="grid grid-cols-3 items-start"
      >
        {pasos.map((paso, indice) => {
          const completo = indice < etapa;
          const actual = indice === etapa;
          return (
            <li key={paso} className="relative flex flex-col items-center gap-1.5 text-center">
              {indice > 0 && (
                <span
                  aria-hidden="true"
                  className={`absolute top-2.5 right-1/2 left-[-50%] h-0.5 ${
                    completo || actual ? "bg-primary" : "bg-border-strong"
                  }`}
                />
              )}
              <span
                aria-hidden="true"
                className={`relative grid size-5 place-items-center rounded-full border-2 ${
                  completo || actual
                    ? "border-primary bg-primary text-white"
                    : "border-border-strong bg-surface text-muted-foreground"
                }`}
              >
                {completo ? (
                  <Check className="size-3" />
                ) : actual ? (
                  <Circle className="size-2 fill-current" />
                ) : null}
              </span>
              <span
                className={`text-xs font-semibold ${
                  actual ? "text-primary" : "text-muted-foreground-strong"
                }`}
              >
                {paso}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function FilaPostulacion({ movimiento }: { movimiento: Movimiento }) {
  return (
    <li className="flex flex-col gap-3 border-b border-border py-4 last:border-b-0">
      <Link
        href={movimiento.href}
        className="rounded-[var(--radius-sm)] text-[15px] font-bold text-foreground outline-none hover:text-primary hover:underline focus-visible:shadow-[var(--sombra-foco)]"
      >
        {movimiento.oferta.titulo}
      </Link>
      <ProgresoPostulacion movimiento={movimiento} />
    </li>
  );
}


function InvitacionPendiente({
  invitacion,
  cantidad,
}: {
  invitacion: FilaMiInvitacion;
  cantidad: number;
}) {
  const tieneVarias = cantidad > 1;
  const href = tieneVarias
    ? "/invitaciones"
    : `/ofertas/${invitacion.oferta_id}`;

  return (
    <section
      aria-label="Invitación pendiente"
      className="flex flex-1 flex-col"
    >
      <div className="flex flex-1 flex-col gap-3">
        <div>
          <Link
            href={`/ofertas/${invitacion.oferta_id}`}
            className="inline-block rounded-[var(--radius-sm)] font-bold text-foreground outline-none hover:text-primary hover:underline focus-visible:shadow-[var(--sombra-foco)]"
          >
            {invitacion.oferta_titulo}
          </Link>

          {invitacion.empresa_nombre && (
            <p className="mt-1 text-sm font-semibold text-muted-foreground-strong">
              {invitacion.empresa_nombre}
            </p>
          )}
        </div>

        <p className="text-sm text-muted-foreground-strong">
          Invitación recibida: {formatFecha(invitacion.creada_en)}
        </p>

        <p className="text-sm leading-relaxed text-muted-foreground-strong">
          La Oficina de Empleo te sugirió esta oferta.
        </p>

        {tieneVarias && (
          <p className="text-sm font-medium text-muted-foreground-strong">
            Tenés {cantidad} invitaciones pendientes para revisar.
          </p>
        )}
      </div>

      <div className="pt-5">
        <Link
          href={href}
          className="btn-primario inline-flex w-full justify-center sm:w-auto"
        >
          {tieneVarias ? "Ver mis invitaciones" : "Ver invitación"}
        </Link>
      </div>
    </section>
  );
}


function TarjetaInvitaciones({
  invitacion,
  cantidad,
}: {
  invitacion: FilaMiInvitacion;
  cantidad: number;
}) {
  return (
    <article className="tarjeta order-2 flex h-full flex-col gap-4 p-4 sm:p-6 xl:order-none">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-extrabold">Invitaciones pendientes</h3>
        <Badge tono="warning" icono={Mail}>
          {cantidad} {cantidad === 1 ? "invitación" : "invitaciones"}
        </Badge>
      </div>
      <InvitacionPendiente
        invitacion={invitacion}
        cantidad={cantidad}
      />
    </article>
  );
}

function PerfilIncompleto({
  perfil,
  destacado,
  mostrarPendientes,
  beneficio,
  accionPrimaria,
  id,
}: {
  perfil: NonNullable<Awaited<ReturnType<typeof obtenerCompletitudPerfil>>["data"]>;
  destacado: boolean;
  mostrarPendientes: boolean;
  beneficio: boolean;
  accionPrimaria: boolean;
  id?: string;
}) {
  const pendientes = perfil.pendientes;
  const sugerencia = pendientes[0];

  return (
    <article
      id={id}
      className={cn(
        "tarjeta order-first flex h-full flex-col gap-4 p-4 sm:p-6 xl:order-none",
      )}
    >
      <h3 className="text-lg font-extrabold">Completá tu perfil</h3>
      <div className="flex items-center gap-3">
        <BarraProgreso
          porcentaje={perfil.porcentaje}
          etiqueta={`Perfil completo al ${perfil.porcentaje}%`}
        />
        <span className="shrink-0 text-sm font-bold text-foreground">{perfil.porcentaje}%</span>
      </div>

      {mostrarPendientes ? (
        <div className="flex flex-1 flex-col gap-3">
          <p className="text-sm font-semibold text-muted-foreground-strong">
            Completá tu perfil para poder postularte.
          </p>
          <div>
            <p className="text-sm font-bold text-foreground">Te falta completar:</p>
            <ul className="mt-2 flex flex-col gap-1.5 text-sm text-muted-foreground-strong">
              {pendientes.map((item) => (
                <li key={item.clave}>{item.texto}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col justify-center rounded-[var(--radius-lg)] border border-border bg-surface-tinted p-4">
          <p className="font-bold text-foreground">
            {sugerencia?.texto ?? "Seguí completando tu perfil"}
          </p>
          {beneficio && (
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground-strong">
              Un perfil completo recibe más respuestas de las empresas.
            </p>
          )}
        </div>
      )}

      {sugerencia && (
        <Link
          href={sugerencia.href}
          className={cn(
            accionPrimaria ? "btn-primario" : "btn-secundario",
            "mt-auto self-start",
          )}
        >
          {mostrarPendientes ? "Completar mi perfil" : "Completar perfil"}
        </Link>
      )}
    </article>
  );
}

function TarjetaPostulaciones({
  activas,
  movimientos,
  errorMovimientos,
  errorInvitaciones,
  invitacion,
  cantidadInvitaciones,
  mostrarAlDia,
  accionPrimaria,
  separarInvitacion = false,
}: {
  activas: number | null;
  movimientos: Movimiento[] | null;
  errorMovimientos: string | null;
  errorInvitaciones: boolean;
  invitacion: FilaMiInvitacion | null;
  cantidadInvitaciones: number;
  mostrarAlDia: boolean;
  accionPrimaria: "postular" | "ver-postulaciones" | null;
  separarInvitacion?: boolean;
}) {
  const sinPostulaciones = activas === 0 && (movimientos?.length ?? 0) === 0;

  return (
    <article className={cn("tarjeta flex h-full flex-col gap-4 p-4 sm:p-6", separarInvitacion && "order-last xl:order-none")}>
      <EncabezadoPostulaciones activas={activas} />

      {invitacion && !separarInvitacion ? (
        <>
          {movimientos && movimientos.length > 0 && (
            <ul aria-label="Postulaciones recientes" className="flex flex-col">
              {movimientos.slice(0, ULTIMAS_POSTULACIONES).map((movimiento) => (
                <FilaPostulacion key={movimiento.postulacionId} movimiento={movimiento} />
              ))}
            </ul>
          )}
          <InvitacionPendiente
            invitacion={invitacion}
            cantidad={cantidadInvitaciones}
          />
        </>
      ) : !separarInvitacion && errorInvitaciones && cantidadInvitaciones > 0 ? (
        <div className="flex flex-1 flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            No pudimos cargar tus invitaciones. Intentá de nuevo en unos minutos.
          </p>
          <Link
            href="/invitaciones"
            className="inline-flex min-h-11 items-center gap-1 self-start rounded-[var(--radius-md)] text-sm font-bold text-primary outline-none hover:underline focus-visible:shadow-[var(--sombra-foco)]"
          >
            Ver invitaciones
            <ChevronRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
      ) : errorMovimientos ? (
        <p className="text-sm text-muted-foreground">
          No pudimos cargar tus postulaciones. Intentá de nuevo en unos minutos.
        </p>
      ) : movimientos && movimientos.length > 0 ? (
        <ul aria-label="Postulaciones recientes" className="flex flex-1 flex-col">
          {movimientos.slice(0, ULTIMAS_POSTULACIONES).map((movimiento) => (
            <FilaPostulacion key={movimiento.postulacionId} movimiento={movimiento} />
          ))}
        </ul>
      ) : (
        <EstadoVacioPostulaciones
          compacto={Boolean(invitacion)}
          mostrarApoyo={!invitacion}
        />
      )}

      {mostrarAlDia && (
        <p className="flex items-start gap-2 rounded-[var(--radius-lg)] border border-border bg-surface-tinted p-3 text-sm font-semibold text-muted-foreground-strong">
          <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success" />
          Estás al día. No tenés novedades por ahora.
        </p>
      )}

      <div className="mt-auto flex flex-col gap-2 sm:flex-row">
        {sinPostulaciones && (!invitacion || separarInvitacion) ? (
          <Link
            href="/ofertas"
            className={cn(
              "justify-center",
              separarInvitacion ? "btn-secundario" : "btn-primario",
            )}
          >
            Explorar ofertas
          </Link>
        ) : null}
        {(!sinPostulaciones || errorMovimientos) && (
          accionPrimaria === "ver-postulaciones" ? (
            <Link href="/mis-postulaciones" className="btn-primario justify-center">
              Ver mis postulaciones
            </Link>
          ) : (
            <Link href="/mis-postulaciones" className="btn-primario justify-center">
              Ver mis postulaciones
            </Link>
          )
        )}
        {invitacion && !separarInvitacion && (
          <Link href="/ofertas" className="btn-secundario justify-center">
            Explorar ofertas
          </Link>
        )}
      </div>
    </article>
  );
}

/**
 * Resumen del postulante en el inicio, con los mismos datos que el panel
 * (src/lib/postulante/panel.ts): postulaciones, invitaciones, notificaciones y perfil.
 */
export async function TuActividad({ postulanteId }: { postulanteId: string }) {
  const [indicadores, movimientos, invitaciones, perfil, notificaciones] = await Promise.all([
    obtenerIndicadoresPostulante(),
    obtenerUltimosMovimientos(postulanteId),
    obtenerInvitacionesPendientes(),
    obtenerCompletitudPerfil(),
    obtenerNotificacionesNoLeidasPostulante(),
  ]);

  if (!indicadores.data) logError("inicio:actividad:indicadores", indicadores.error);
  if (!movimientos.data) logError("inicio:actividad:movimientos", movimientos.error);
  if (!invitaciones.data) logError("inicio:actividad:invitaciones", invitaciones.error);
  if (!perfil.data) logError("inicio:actividad:perfil", perfil.error);
  if (!notificaciones.data && notificaciones.error) {
    logError("inicio:actividad:notificaciones", notificaciones.error);
  }

  const activas = indicadores.data?.postulaciones_activas ?? null;
  const cantidadInvitaciones = indicadores.data?.invitaciones_pendientes ?? 0;
  const invitacion = invitaciones.data?.[0] ?? null;
  const perfilIncompleto = (perfil.data?.pendientes.length ?? 0) > 0;
  const hayNotificaciones = (notificaciones.data ?? 0) > 0;
  const tienePostulaciones = (activas ?? 0) > 0;
  const mostrarAlDia =
    tienePostulaciones &&
    !perfilIncompleto &&
    cantidadInvitaciones === 0 &&
    notificaciones.data === 0;
  const perfilEsFoco =
    perfilIncompleto &&
    (cantidadInvitaciones > 0 || (tienePostulaciones && !hayNotificaciones));
  const separarInvitacion =
    Boolean(invitacion) && (tienePostulaciones || perfilIncompleto);
  const accionPrimaria: "postular" | "ver-postulaciones" | null =
    invitacion
      ? "postular"
      : tienePostulaciones && !perfilEsFoco
        ? "ver-postulaciones"
        : null;
  const mostrarTarjetaPerfil = !perfil.data || perfil.data.pendientes.length > 0;

  return (
    <section aria-labelledby="tu-actividad-titulo" className="@container">
      <EncabezadoTuActividad />

      <div
        className={cn(
          "mt-5 grid grid-cols-1 items-stretch gap-4",
          separarInvitacion
            ? mostrarTarjetaPerfil
              ? "@3xl:grid-cols-3"
              : "@3xl:grid-cols-2"
            : mostrarTarjetaPerfil
              ? "@3xl:grid-cols-2"
              : "",
        )}
      >
        <TarjetaPostulaciones
          activas={activas}
          movimientos={movimientos.data}
          errorMovimientos={movimientos.data ? null : "error"}
          errorInvitaciones={!invitaciones.data}
          invitacion={separarInvitacion ? null : invitacion}
          cantidadInvitaciones={cantidadInvitaciones}
          mostrarAlDia={mostrarAlDia}
          accionPrimaria={accionPrimaria}
          separarInvitacion={separarInvitacion}
        />

        {separarInvitacion && invitacion && (
          <TarjetaInvitaciones
            invitacion={invitacion}
            cantidad={cantidadInvitaciones}
          />
        )}

        {perfil.data && perfil.data.pendientes.length > 0 && (
          <PerfilIncompleto
            perfil={perfil.data}
            destacado={perfilEsFoco}
            mostrarPendientes={cantidadInvitaciones > 0}
            beneficio={tienePostulaciones && !cantidadInvitaciones}
            accionPrimaria={perfilEsFoco}
            id="perfil-postulante-incompleto"
          />
        )}

        {!perfil.data && (
          <article className="tarjeta flex h-full flex-col gap-4 p-4 sm:p-6">
            <h3 className="text-lg font-extrabold">Completá tu perfil</h3>
            <p className="text-sm text-muted-foreground">
              No pudimos cargar el estado de tu perfil. Intentá de nuevo en unos minutos.
            </p>
            <Link href="/perfil" className="btn-secundario mt-auto self-start">
              Ver mi perfil
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
