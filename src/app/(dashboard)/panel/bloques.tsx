import Link from "next/link";
import {
  BadgeCheck,
  Briefcase,
  CheckCircle2,
  ChevronRight,
  Circle,
  CircleX,
  Mail,
  Search,
  Send,
  Undo2,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logError } from "@/lib/logger";
import { formatFechaHora, formatFechaRelativa } from "@/lib/fechas";
import {
  AVISO_OFERTA_RETIRADA,
  ETIQUETA_FILTRO,
  INDICADOR_FILTRO,
  TEXTO_NO_SELECCIONADO,
  TEXTO_SELECCIONADO,
  badgePostulacion,
  cantidadConEstado,
  type FiltroMisPostulaciones,
} from "@/lib/mis-postulaciones";
import { hrefSeccionPerfil, SECCION_PERFIL } from "@/lib/perfil-secciones";
import { textoInvitacionReciente } from "@/lib/invitaciones";
import {
  obtenerCompletitudPerfil,
  obtenerIndicadoresPostulante,
  obtenerInvitacionesPendientes,
  obtenerOfertasRecomendadas,
  obtenerUltimosMovimientos,
  type Movimiento,
} from "@/lib/postulante/panel";
import { formatNumero } from "@/components/indicadores/formato";
import { EstadoVacio, ErrorListado } from "@/components/ui/estado-listado";
import { Badge, claseTextoTono, type TonoBadge } from "@/components/ui/badge";
import { BarraProgreso } from "@/components/ui/barra-progreso";
import { TarjetaOferta } from "@/components/ofertas/tarjeta-oferta";
import { BadgeCoincidencia } from "@/components/ofertas/coincidencia";
import { CLASE_GRILLA_INDICADORES, claseCuadroIndicador } from "./esqueletos";

// Bloques de /panel. Cada uno carga sus datos dentro de su propio Suspense y,
// si falla, muestra su error sin afectar a los demás (docs/decisiones/029).

const MIS_POSTULACIONES = "/mis-postulaciones";
const INVITACIONES = "/invitaciones";

const CLASE_LINK_TITULO =
  "inline-flex min-h-11 items-center gap-1 rounded-[var(--radius-md)] text-[15px] font-bold whitespace-nowrap text-primary outline-none hover:underline focus-visible:shadow-[var(--sombra-foco)]";

/** Título de bloque (20 px, 800) con su bajada y un link a la derecha. */
function TituloBloque({
  id,
  titulo,
  bajada,
  enlace,
}: {
  id: string;
  titulo: string;
  bajada?: string;
  enlace?: { href: string; texto: string };
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
      <div className="min-w-0">
        <h2 id={id} className="text-xl leading-tight font-extrabold">
          {titulo}
        </h2>
        {bajada && <p className="mt-1 text-[15px] text-muted-foreground">{bajada}</p>}
      </div>
      {enlace && (
        <Link href={enlace.href} className={CLASE_LINK_TITULO}>
          {enlace.texto}
          <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}

/** Botones del encabezado; también los muestra loading.tsx. */
export function AccionesPanel() {
  return (
    <>
      <Link href="/perfil" className="btn-neutro">
        Editar perfil
      </Link>
      <Link href="/ofertas" className="btn-primario">
        <Search aria-hidden="true" />
        Buscar ofertas
      </Link>
    </>
  );
}

// ── Indicadores ────────────────────────────────────────────────────────────

type Indicador = { filtro: FiltroMisPostulaciones; tono: TonoBadge; icono: LucideIcon };

// El tono es el del badge de cada estado (badgePostulacion). La grilla y el
// esqueleto (esqueletos.tsx) están pensados para estos cinco cuadros.
const INDICADORES: Indicador[] = [
  { filtro: "en-revision", tono: "info", icono: Search },
  { filtro: "derivadas", tono: "teal", icono: Send },
  { filtro: "seleccionadas", tono: "success", icono: BadgeCheck },
  { filtro: "no-seleccionadas", tono: "neutral", icono: CircleX },
  { filtro: "retiradas", tono: "neutral", icono: Undo2 },
];

export async function BloqueIndicadores() {
  const { data: i, error } = await obtenerIndicadoresPostulante();

  if (!i) {
    const ref = logError("panel_postulante:indicadores", error);
    return (
      <section aria-labelledby="panel-indicadores">
        <h2 id="panel-indicadores" className="sr-only">
          Tus postulaciones
        </h2>
        <ErrorListado
          mensaje="No pudimos cargar tus indicadores. Intentá de nuevo en unos minutos."
          refError={ref}
        />
      </section>
    );
  }

  // Cada cuadro lleva a Mis postulaciones filtrada por su estado, con los
  // mismos criterios que este número (CRITERIO_FILTRO).
  return (
    <section aria-labelledby="panel-indicadores" className="@container">
      <h2 id="panel-indicadores" className="sr-only">
        Tus postulaciones
      </h2>
      <ul className={CLASE_GRILLA_INDICADORES}>
        {INDICADORES.map(({ filtro, tono, icono: Icono }, indice) => {
          const valor = Number(i[INDICADOR_FILTRO[filtro]]);
          return (
            <li key={filtro} className={claseCuadroIndicador(indice)}>
              <Link
                href={`${MIS_POSTULACIONES}?estado=${filtro}`}
                aria-label={`${cantidadConEstado(filtro, valor)}. Ver lista`}
                className="tarjeta tarjeta-clickeable flex h-full flex-col gap-2.5 p-5 outline-none focus-visible:shadow-[var(--sombra-foco)]"
              >
                <Badge tono={tono} estado multilinea>
                  {ETIQUETA_FILTRO[filtro]}
                </Badge>
                {/* El ícono a la izquierda del número; arriba si el cuadro es angosto. */}
                <div className="@container">
                  <div className="flex flex-col items-start gap-2.5 @[7.5rem]:flex-row @[7.5rem]:items-center @[7.5rem]:gap-3">
                    <span
                      aria-hidden="true"
                      className="grid size-10 shrink-0 place-items-center rounded-[var(--radius-md)] bg-secondary"
                    >
                      <Icono className={cn("size-5", claseTextoTono(tono))} />
                    </span>
                    <span className="text-[36px] leading-none font-extrabold text-heading">
                      {formatNumero(valor)}
                    </span>
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ── Invitaciones ───────────────────────────────────────────────────────────

/**
 * Solo aparece con invitaciones pendientes. El número sale de los
 * indicadores (si fallan, el error lo muestra BloqueIndicadores); el detalle,
 * de la invitación más reciente.
 */
export async function AvisoInvitaciones() {
  const [{ data }, invitaciones] = await Promise.all([
    obtenerIndicadoresPostulante(),
    obtenerInvitacionesPendientes(),
  ]);
  const cantidad = data?.invitaciones_pendientes ?? 0;
  if (cantidad === 0) return null;
  if (!invitaciones.data) logError("panel_postulante:invitaciones", invitaciones.error);

  const titulo =
    cantidad === 1
      ? "Tenés 1 invitación pendiente"
      : `Tenés ${formatNumero(cantidad)} invitaciones pendientes`;
  const reciente = invitaciones.data?.[0];

  return (
    <section
      aria-label="Invitaciones"
      className="flex flex-col gap-4 rounded-[var(--radius-xl)] border-2 border-accent bg-surface px-5 py-[18px] sm:flex-row sm:items-center"
    >
      <div className="flex min-w-0 flex-1 items-start gap-4 sm:items-center">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
          <Mail className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-[17px] leading-snug font-extrabold text-invitacion-titulo">{titulo}</p>
          <p className="mt-0.5 text-[15px] leading-[1.45] text-invitacion-detalle">
            {reciente
              ? textoInvitacionReciente(reciente, cantidad)
              : "La Oficina de Empleo te propone ofertas que coinciden con tu perfil."}
          </p>
        </div>
      </div>
      <Link href={INVITACIONES} className="btn-oscuro shrink-0">
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
      id="panel-movimientos"
      titulo="Últimos movimientos"
      enlace={{ href: MIS_POSTULACIONES, texto: "Ver mis postulaciones" }}
    />
  );

  let contenido: React.ReactNode;
  if (!movimientos) {
    const ref = logError("panel_postulante:movimientos", error);
    contenido = (
      <ErrorListado
        className="mt-4"
        mensaje="No pudimos cargar tus postulaciones. Intentá de nuevo en unos minutos."
        refError={ref}
      />
    );
  } else if (movimientos.length === 0) {
    contenido = (
      <EstadoVacio
        tipo="sin-registros"
        className="mt-4"
        icono={Briefcase}
        titulo="Todavía no te postulaste a ninguna oferta"
        descripcion="Explorá las búsquedas activas y encontrá tu próximo trabajo."
        accion={
          <Link href="/ofertas" className="btn-primario">
            Ver ofertas laborales
          </Link>
        }
      />
    );
  } else {
    contenido = (
      <ul className="mt-2">
        {movimientos.map((m) => {
          const badge = badgePostulacion({
            estado: m.estado,
            estadoEmpresa: m.estadoEmpresa,
            ofertaEstado: m.ofertaEstado,
            ofertaNoVisible: m.ofertaNoVisible,
          });
          const detalle = detalleMovimiento(m);
          return (
            <li key={m.postulacionId} className="border-t border-tabla-borde first:border-t-0">
              <Link
                href={m.href}
                className="-mx-2 flex items-start gap-3 rounded-[var(--radius-lg)] px-2 py-3 outline-none transition-colors hover:bg-tabla-hover focus-visible:shadow-[var(--sombra-foco)]"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-white">
                  <Briefcase className="size-5" aria-hidden="true" />
                </span>
                <div className="flex min-w-0 flex-1 flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
                  <div className="min-w-[12rem] flex-1 text-[15px] leading-[1.45] text-foreground">
                    <p className="break-words">
                      <span className="font-bold">{m.oferta.titulo}</span>
                      {m.oferta.empresaNombre && (
                        <span className="text-muted-foreground-strong"> · {m.oferta.empresaNombre}</span>
                      )}
                    </p>
                    {detalle && <p className="text-muted-foreground-strong">{detalle}</p>}
                    <time dateTime={m.fecha} className="text-[13px] text-muted-foreground">
                      {formatFechaRelativa(m.fecha)}
                    </time>
                  </div>
                  <Badge tono={badge.tono} estado>
                    {badge.label}
                  </Badge>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <section aria-labelledby="panel-movimientos" className="tarjeta p-6">
      {titulo}
      {contenido}
    </section>
  );
}

// ── Completá tu perfil ─────────────────────────────────────────────────────

export async function BloquePerfil() {
  const { data: perfil, error } = await obtenerCompletitudPerfil();

  if (!perfil) {
    const ref = logError("panel_postulante:perfil", error);
    return (
      <ErrorListado
        mensaje="No pudimos revisar tu perfil. Intentá de nuevo en unos minutos."
        refError={ref}
      />
    );
  }

  const completo = perfil.pendientes.length === 0;

  return (
    <section aria-labelledby="panel-perfil" className="tarjeta flex flex-col gap-4 p-6">
      <div>
        <h2 id="panel-perfil" className="text-xl leading-tight font-extrabold">
          {completo ? "Tu perfil está completo" : "Completá tu perfil"}
        </h2>
        <p className="mt-1.5 text-[15px] leading-[1.45] text-muted-foreground">
          Los perfiles completos y con domicilio verificado en Funes tienen prioridad en la Oficina
          de Empleo.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <BarraProgreso
          porcentaje={perfil.porcentaje}
          etiqueta={`Perfil completo al ${perfil.porcentaje}%`}
        />
        <span aria-hidden="true" className="shrink-0 text-sm font-bold text-foreground">
          {perfil.porcentaje}%
        </span>
      </div>

      <ul className="flex flex-col">
        {perfil.items.map((item) =>
          item.completo ? (
            <li key={item.clave} className="flex min-h-11 items-center gap-2.5 text-[15px] text-foreground">
              <CheckCircle2 className="size-5 shrink-0 text-primary" aria-hidden="true" />
              <span className="sr-only">Completo: </span>
              {item.texto}
            </li>
          ) : (
            <li key={item.clave}>
              <Link
                href={item.href}
                className="flex min-h-11 items-center gap-2.5 rounded-[var(--radius-md)] py-1 text-[15px] font-bold text-primary outline-none hover:underline focus-visible:shadow-[var(--sombra-foco)]"
              >
                <Circle className="size-5 shrink-0 text-muted-icon" aria-hidden="true" />
                <span className="sr-only">Pendiente: </span>
                {item.texto}
              </Link>
            </li>
          ),
        )}
      </ul>

      {!completo && (
        <Link href={perfil.pendientes[0].href} className="btn-secundario self-start">
          Completar perfil
        </Link>
      )}
    </section>
  );
}

// ── Ofertas para vos ───────────────────────────────────────────────────────

export async function BloqueOfertas() {
  const [{ data: ofertas, error }, perfil] = await Promise.all([
    obtenerOfertasRecomendadas(),
    obtenerCompletitudPerfil(),
  ]);
  const rubros = perfil.data?.rubros ?? [];
  const titulo = (
    <TituloBloque
      id="panel-ofertas"
      titulo="Ofertas para vos"
      bajada={
        rubros.length > 0
          ? `Según tus rubros: ${rubros.join(", ")}`
          : "Ofertas vigentes que coinciden con tu experiencia y tu disponibilidad."
      }
      enlace={{ href: "/ofertas", texto: "Ver todas las ofertas" }}
    />
  );

  let contenido: React.ReactNode;
  if (!ofertas) {
    const ref = logError("panel_postulante:ofertas", error);
    contenido = (
      <ErrorListado
        className="mt-5"
        mensaje="No pudimos cargar las ofertas para vos. Intentá de nuevo en unos minutos."
        refError={ref}
      />
    );
  } else if (ofertas.length === 0) {
    contenido = (
      <EstadoVacio
        tipo="sin-registros"
        className="mt-5"
        icono={Search}
        titulo="Todavía no hay ofertas que coincidan con tu perfil."
        accion={
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link href="/ofertas" className="btn-primario">
              Ver todas las ofertas
            </Link>
            <Link href={hrefSeccionPerfil(SECCION_PERFIL.rubros)} className="btn-secundario">
              Completar mis intereses
            </Link>
          </div>
        }
      />
    );
  } else {
    contenido = (
      <ul className="mt-5 grid grid-cols-1 gap-4 @xl:grid-cols-2 @4xl:grid-cols-3">
        {ofertas.map((o) => (
          <li key={o.id}>
            <TarjetaOferta
              href={`/ofertas/${o.id}`}
              titulo={o.titulo}
              empresa={o.empresa_nombre}
              rubros={o.rubros_coincidentes ?? []}
              modalidad={o.modalidad}
              lugar={o.lugar}
              badges={<BadgeCoincidencia nivel={o.nivel} puntaje={o.puntaje} />}
              textoAccion="Postularme"
              accionPrimaria
            />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <section aria-labelledby="panel-ofertas" className="@container">
      {titulo}
      {contenido}
    </section>
  );
}
