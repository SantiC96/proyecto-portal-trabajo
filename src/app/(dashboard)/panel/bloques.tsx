import Link from "next/link";
import {
  Briefcase,
  Building,
  ChevronRight,
  ClipboardCheck,
  Hourglass,
  Mail,
  MapPin,
  Search,
  UserRoundPen,
} from "lucide-react";
import { logError } from "@/lib/logger";
import { formatFecha, formatFechaHora } from "@/lib/fechas";
import {
  AVISO_OFERTA_RETIRADA,
  TEXTO_NO_SELECCIONADO,
  TEXTO_SELECCIONADO,
  badgePostulacion,
} from "@/lib/mis-postulaciones";
import { hrefSeccionPerfil, SECCION_PERFIL } from "@/lib/perfil-secciones";
import {
  obtenerIndicadoresPostulante,
  obtenerOfertasRecomendadas,
  obtenerPendientesPerfil,
  obtenerUltimosMovimientos,
  type Movimiento,
} from "@/lib/postulante/panel";
import { cn } from "@/lib/utils";
import type { FilaOfertaRecomendada, Tabla } from "@/types/db";
import {
  GrupoIndicadores,
  formatNumero,
  type Indicador,
} from "@/components/indicadores/grupo-indicadores";
import { TituloBloque } from "@/components/indicadores/titulo-bloque";
import { EstadoVacio, ErrorListado } from "@/components/ui/estado-listado";
import { VencimientoOferta } from "@/components/ofertas/vencimiento-oferta";
import { BadgeCoincidencia, MotivosCoincidencia } from "@/components/ofertas/coincidencia";

// Bloques de /panel. Cada uno carga sus datos dentro de su propio Suspense y,
// si falla, muestra su error sin afectar a los demás (docs/decisiones/029).

const MIS_POSTULACIONES = "/mis-postulaciones";
const INVITACIONES = "/invitaciones";

const CLASE_TARJETA_LINK =
  "relative block rounded-[var(--radius-lg)] border border-border bg-surface p-4 pr-10 shadow-xs transition-colors hover:bg-surface-tinted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30";

// ── Indicadores ────────────────────────────────────────────────────────────

export async function BloqueIndicadores() {
  const { data: i, error } = await obtenerIndicadoresPostulante();

  if (!i) {
    const ref = logError("panel_postulante:indicadores", error);
    return (
      <div>
        <TituloBloque titulo="Tus postulaciones" descripcion="Cómo están hoy." />
        <ErrorListado
          className="mt-4"
          mensaje="No pudimos cargar tus indicadores. Intentá de nuevo en unos minutos."
          refError={ref}
        />
      </div>
    );
  }

  // Mis postulaciones no tiene filtros ni pestañas: todos llevan al listado.
  const enCurso: Indicador[] = [
    {
      etiqueta: "Activas",
      valor: formatNumero(i.postulaciones_activas),
      detalle: "En revisión o en la empresa",
      href: MIS_POSTULACIONES,
    },
    {
      etiqueta: "En revisión",
      valor: formatNumero(i.en_revision),
      detalle: "En la Oficina de Empleo",
      href: MIS_POSTULACIONES,
    },
    {
      etiqueta: "Enviadas a la empresa",
      valor: formatNumero(i.derivadas_sin_resultado),
      detalle: "Sin resultado todavía",
      href: MIS_POSTULACIONES,
    },
    {
      etiqueta: "Invitaciones",
      valor: formatNumero(i.invitaciones_pendientes),
      detalle: "Para responder",
      href: INVITACIONES,
    },
  ];

  const cerradas: Indicador[] = [
    { etiqueta: "Seleccionadas", valor: formatNumero(i.contratadas), href: MIS_POSTULACIONES },
    {
      etiqueta: "No seleccionadas",
      valor: formatNumero(i.no_seleccionadas),
      detalle: "Por la oficina o la empresa",
      href: MIS_POSTULACIONES,
    },
    { etiqueta: "Retiradas", valor: formatNumero(i.retiradas), href: MIS_POSTULACIONES },
  ];

  return (
    <div>
      <TituloBloque titulo="Tus postulaciones" descripcion="Cómo están hoy." />
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <GrupoIndicadores titulo="En curso" icono={Hourglass} indicadores={enCurso} />
        <GrupoIndicadores titulo="Con resultado" icono={ClipboardCheck} indicadores={cerradas} />
      </div>
    </div>
  );
}

// ── Invitaciones ───────────────────────────────────────────────────────────

/** Solo aparece con invitaciones pendientes. Si falla, el error lo muestra BloqueIndicadores. */
export async function AvisoInvitaciones() {
  const { data } = await obtenerIndicadoresPostulante();
  const cantidad = data?.invitaciones_pendientes ?? 0;
  if (cantidad === 0) return null;

  const texto =
    cantidad === 1
      ? "Tenés 1 invitación para responder"
      : `Tenés ${formatNumero(cantidad)} invitaciones para responder`;

  return (
    <section
      aria-label="Invitaciones"
      className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-blue-200 bg-blue-50 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-blue-700">
          <Mail className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-blue-900">{texto}</p>
          <p className="mt-0.5 text-sm text-blue-800">
            La Oficina de Empleo te propone ofertas que coinciden con tu perfil.
          </p>
        </div>
      </div>
      <Link
        href={INVITACIONES}
        className="btn-primario inline-flex min-h-11 shrink-0 items-center justify-center px-4 text-sm"
      >
        Ver invitaciones
      </Link>
    </section>
  );
}

// ── Últimos movimientos ────────────────────────────────────────────────────

/** El resultado de la empresa, con los mismos textos que Mis postulaciones. */
function detalleMovimiento(m: Movimiento): string | null {
  if (m.estado === "oferta_retirada") return AVISO_OFERTA_RETIRADA;
  if (m.estado !== "derivada") return null;
  if (m.estadoEmpresa === "contratado") return TEXTO_SELECCIONADO;
  if (m.estadoEmpresa === "rechazado") return TEXTO_NO_SELECCIONADO;
  if (m.estadoEmpresa === "oferta_retirada") return AVISO_OFERTA_RETIRADA;
  if (m.estadoEmpresa === "en_proceso" && m.fechaEntrevista) {
    return `Entrevista coordinada: ${formatFechaHora(m.fechaEntrevista)}`;
  }
  return null;
}

export async function BloqueMovimientos({ postulanteId }: { postulanteId: string }) {
  const { data: movimientos, error } = await obtenerUltimosMovimientos(postulanteId);
  const titulo = (
    <TituloBloque
      titulo="Últimos movimientos"
      descripcion="Los últimos cambios de estado de tus postulaciones."
    />
  );

  if (!movimientos) {
    const ref = logError("panel_postulante:movimientos", error);
    return (
      <div>
        {titulo}
        <ErrorListado
          className="mt-4"
          mensaje="No pudimos cargar tus postulaciones. Intentá de nuevo en unos minutos."
          refError={ref}
        />
      </div>
    );
  }

  if (movimientos.length === 0) {
    return (
      <div>
        {titulo}
        <EstadoVacio
          tipo="sin-registros"
          className="mt-4"
          icono={Briefcase}
          titulo="Todavía no te postulaste a ninguna oferta"
          descripcion="Explorá las búsquedas activas y encontrá tu próximo trabajo."
          accion={
            <Link href="/ofertas" className="btn-primario inline-flex min-h-11 items-center px-4 text-sm">
              Ver ofertas laborales
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div>
      {titulo}
      <ul className="mt-4 flex flex-col gap-3">
        {movimientos.map((m) => {
          const badge = badgePostulacion({
            estado: m.estado,
            estadoEmpresa: m.estadoEmpresa,
            ofertaEstado: m.ofertaEstado,
            ofertaNoVisible: m.ofertaNoVisible,
          });
          const detalle = detalleMovimiento(m);
          return (
            <li key={m.postulacionId}>
              <Link href={m.href} className={CLASE_TARJETA_LINK}>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="min-w-0 break-words font-semibold text-foreground">
                    {m.oferta.titulo}
                  </p>
                  <span
                    className={cn(
                      "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium",
                      badge.className,
                    )}
                  >
                    {badge.label}
                  </span>
                </div>
                {m.oferta.empresaNombre && (
                  <p className="mt-0.5 text-sm text-muted-foreground">{m.oferta.empresaNombre}</p>
                )}
                {detalle && <p className="mt-1 text-sm text-muted-foreground-strong">{detalle}</p>}
                <p className="mt-1 text-xs text-muted-foreground">
                  Último cambio: {formatFecha(m.fecha)}
                </p>
                <ChevronRight
                  className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-icon"
                  aria-hidden="true"
                />
              </Link>
            </li>
          );
        })}
      </ul>
      <Link
        href={MIS_POSTULACIONES}
        className="mt-3 inline-flex min-h-11 items-center gap-1 text-sm font-medium text-primary underline-offset-2 hover:underline"
      >
        Ver todas mis postulaciones
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </div>
  );
}

// ── Completá tu perfil ─────────────────────────────────────────────────────

/** Solo aparece si le falta algo al perfil. */
export async function BloquePerfil({
  usuario,
}: {
  usuario: Pick<Tabla<"usuarios">, "id" | "nombre" | "apellido" | "telefono">;
}) {
  const { data: pendientes, error } = await obtenerPendientesPerfil(usuario);

  if (!pendientes) {
    const ref = logError("panel_postulante:perfil", error);
    return (
      <ErrorListado
        mensaje="No pudimos revisar tu perfil. Intentá de nuevo en unos minutos."
        refError={ref}
      />
    );
  }
  if (pendientes.length === 0) return null;

  return (
    <section
      aria-label="Completá tu perfil"
      className="rounded-[var(--radius-lg)] border border-border bg-surface p-4 shadow-xs sm:p-5"
    >
      <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-primary">
          <UserRoundPen className="h-4 w-4" aria-hidden="true" />
        </span>
        Completá tu perfil
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Así la Oficina de Empleo te conoce mejor y encontrás más ofertas que coinciden con vos.
      </p>
      <ul className="mt-3 divide-y divide-border">
        {pendientes.map((p) => (
          <li key={p.clave}>
            <Link
              href={p.href}
              className="flex min-h-11 items-center justify-between gap-3 py-2 text-sm font-medium text-primary underline-offset-2 hover:underline"
            >
              <span className="min-w-0">{p.texto}</span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-icon" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ── Ofertas para vos ───────────────────────────────────────────────────────

function TarjetaOferta({ oferta: o }: { oferta: FilaOfertaRecomendada }) {
  return (
    <Link href={`/ofertas/${o.id}`} className={CLASE_TARJETA_LINK}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="break-words font-semibold text-foreground">{o.titulo}</h3>
          {o.empresa_nombre && (
            <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground-strong">
              <Building className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="truncate">{o.empresa_nombre}</span>
            </p>
          )}
        </div>
        <BadgeCoincidencia nivel={o.nivel} puntaje={o.puntaje} />
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <span className="inline-flex min-w-0 max-w-full items-center gap-1 rounded-md bg-surface-tinted px-2.5 py-1 font-medium text-foreground">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
          <span className="truncate">{o.lugar}</span>
        </span>
        <span className="whitespace-nowrap rounded-md bg-gray-100 px-2.5 py-1 font-medium text-muted-foreground-strong">
          {o.modalidad}
        </span>
      </div>

      <VencimientoOferta estado="activa" venceEn={o.vence_en} className="mt-2" />
      <MotivosCoincidencia datos={o} className="mt-3" />

      <ChevronRight
        className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-icon"
        aria-hidden="true"
      />
    </Link>
  );
}

export async function BloqueOfertas() {
  const { data: ofertas, error } = await obtenerOfertasRecomendadas();
  const titulo = (
    <TituloBloque
      titulo="Ofertas para vos"
      descripcion="Ofertas vigentes que coinciden con tus rubros, tu experiencia y tu disponibilidad."
    />
  );

  if (!ofertas) {
    const ref = logError("panel_postulante:ofertas", error);
    return (
      <div>
        {titulo}
        <ErrorListado
          className="mt-4"
          mensaje="No pudimos cargar las ofertas para vos. Intentá de nuevo en unos minutos."
          refError={ref}
        />
      </div>
    );
  }

  if (ofertas.length === 0) {
    return (
      <div>
        {titulo}
        <EstadoVacio
          tipo="sin-registros"
          className="mt-4"
          icono={Search}
          titulo="Todavía no hay ofertas que coincidan con tu perfil."
          accion={
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link
                href="/ofertas"
                className="btn-primario inline-flex min-h-11 items-center justify-center px-4 text-sm"
              >
                Ver todas las ofertas
              </Link>
              <Link
                href={hrefSeccionPerfil(SECCION_PERFIL.rubros)}
                className="btn-secundario inline-flex min-h-11 items-center justify-center px-4 text-sm font-medium"
              >
                Completar mis intereses
              </Link>
            </div>
          }
        />
      </div>
    );
  }

  return (
    <div>
      {titulo}
      <ul className="mt-4 flex flex-col gap-3">
        {ofertas.map((o) => (
          <li key={o.id}>
            <TarjetaOferta oferta={o} />
          </li>
        ))}
      </ul>
      <Link
        href="/ofertas"
        className="mt-3 inline-flex min-h-11 items-center gap-1 text-sm font-medium text-primary underline-offset-2 hover:underline"
      >
        Ver todas las ofertas
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </div>
  );
}
