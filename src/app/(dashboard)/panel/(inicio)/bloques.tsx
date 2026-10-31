import Link from "next/link";
import {
  Activity,
  Briefcase,
  CircleCheck,
  Mail,
  Search,
  TriangleAlert,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logError } from "@/lib/logger";
import { formatFechaHora, formatFechaRelativa } from "@/lib/fechas";
import {
  AVISO_OFERTA_RETIRADA,
  ETIQUETA_FILTRO,
  FILTROS_MIS_POSTULACIONES,
  INDICADOR_FILTRO,
  TEXTO_NO_SELECCIONADO,
  TEXTO_SELECCIONADO,
  badgePostulacion,
  cantidadConEstado,
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
import { Badge } from "@/components/ui/badge";
import { AnilloProgreso } from "@/components/ui/anillo-progreso";
import { IconoCuadro } from "@/components/ui/icono-cuadro";
import { LineaDeTiempo } from "@/components/ui/linea-de-tiempo";
import { ACENTO_ESTADO, ACENTO_FILTRO } from "@/components/postulantes/acento-estado";
import { TarjetaOferta } from "@/components/ofertas/tarjeta-oferta";
import { BadgeCoincidencia } from "@/components/ofertas/coincidencia";
import { CuadroEstado } from "@/components/ui/cuadro-estado";
import { TituloBloque } from "@/components/ui/titulo-bloque";
import {
  CLASE_GRILLA_INDICADORES,
  CLASE_GRILLA_OFERTAS,
  claseCuadroIndicador,
} from "./esqueletos";

// Bloques de /panel. Cada uno carga sus datos dentro de su propio Suspense y,
// si falla, muestra su error sin afectar a los demás (docs/decisiones/029).

const MIS_POSTULACIONES = "/mis-postulaciones";
const INVITACIONES = "/invitaciones";

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

// El color y el ícono de cada cuadro son los de su estado (ACENTO_FILTRO). La
// grilla y el esqueleto (esqueletos.tsx) están pensados para estos cinco.

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
        {FILTROS_MIS_POSTULACIONES.map((filtro, indice) => {
          const valor = Number(i[INDICADOR_FILTRO[filtro]]);
          const acento = ACENTO_FILTRO[filtro];
          return (
            <li key={filtro} className={claseCuadroIndicador(indice)}>
              <CuadroEstado
                href={`${MIS_POSTULACIONES}?estado=${filtro}`}
                etiquetaAccesible={`${cantidadConEstado(filtro, valor)}. Ver lista`}
                etiqueta={ETIQUETA_FILTRO[filtro]}
                valor={valor}
                icono={acento.icono}
                claseIcono={acento.fondo}
                claseFilete={acento.filete}
              />
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
      icono={Activity}
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
      <LineaDeTiempo
        className="mt-5"
        eventos={movimientos.map((m) => {
          const badge = badgePostulacion({
            estado: m.estado,
            estadoEmpresa: m.estadoEmpresa,
            ofertaEstado: m.ofertaEstado,
            ofertaNoVisible: m.ofertaNoVisible,
          });
          const acento = ACENTO_ESTADO[badge.clave];
          const detalle = detalleMovimiento(m);
          return {
            clave: m.postulacionId,
            icono: acento.icono,
            claseIcono: acento.fondo,
            // El link cubre todo el movimiento, como antes.
            titulo: (
              <Link
                href={m.href}
                className="rounded-[var(--radius-sm)] outline-none after:absolute after:inset-0 after:rounded-[var(--radius-lg)] hover:underline focus-visible:after:shadow-[var(--sombra-foco)]"
              >
                <span className="font-extrabold text-heading">{m.oferta.titulo}</span>
                {m.oferta.empresaNombre && (
                  <span className="font-medium text-muted-foreground-strong">
                    {" "}
                    · {m.oferta.empresaNombre}
                  </span>
                )}
              </Link>
            ),
            detalle: (
              <>
                {detalle && <p className="text-muted-foreground-strong">{detalle}</p>}
                <time dateTime={m.fecha} className="block text-[13px] text-muted-foreground">
                  {formatFechaRelativa(m.fecha)}
                </time>
              </>
            ),
            extra: (
              <Badge tono={badge.tono} estado>
                {badge.label}
              </Badge>
            ),
          };
        })}
      />
    );
  }

  return (
    <section aria-labelledby="panel-movimientos" className="tarjeta tarjeta-panel @container">
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
  const completos = perfil.items.filter((item) => item.completo);

  return (
    <section aria-labelledby="panel-perfil" className="tarjeta tarjeta-panel flex flex-col gap-5">
      <div className="flex min-w-0 items-center gap-3">
        <IconoCuadro icono={User} />
        <h2 id="panel-perfil" className="text-xl leading-tight font-extrabold text-heading">
          {completo ? "Tu perfil está completo" : "Completá tu perfil"}
        </h2>
      </div>

      <div className="flex items-center gap-4">
        <AnilloProgreso
          porcentaje={perfil.porcentaje}
          etiqueta={`Perfil completo al ${perfil.porcentaje}%`}
        />
        <p className="min-w-0 text-[15px] leading-[1.45] text-muted-foreground">
          Los perfiles completos y con domicilio verificado en Funes tienen prioridad en la Oficina
          de Empleo.
        </p>
      </div>

      {/* Lo pendiente primero, resaltado. */}
      <ul className="flex flex-col gap-1.5">
        {perfil.pendientes.map((item) => (
          <li key={item.clave}>
            <Link
              href={item.href}
              className="flex min-h-11 items-center gap-2.5 rounded-[var(--radius-md)] bg-accent/18 px-3 py-2 text-[15px] leading-snug font-bold text-accent-foreground outline-none hover:underline focus-visible:shadow-[var(--sombra-foco)]"
            >
              <TriangleAlert className="size-5 shrink-0" aria-hidden="true" />
              <span className="sr-only">Pendiente: </span>
              {item.texto}
            </Link>
          </li>
        ))}
        {completos.map((item) => (
          <li
            key={item.clave}
            className="flex min-h-11 items-center gap-2.5 px-3 text-[15px] leading-snug text-foreground"
          >
            <CircleCheck className="size-5 shrink-0 text-primary" aria-hidden="true" />
            <span className="sr-only">Completo: </span>
            {item.texto}
          </li>
        ))}
      </ul>

      {!completo && (
        <Link href={perfil.pendientes[0].href} className="btn-secundario mt-auto self-start">
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
      icono={Briefcase}
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
      <ul className={cn("mt-5", CLASE_GRILLA_OFERTAS)}>
        {ofertas.map((o) => (
          <li key={o.id}>
            <TarjetaOferta
              variante="detallada"
              href={`/ofertas/${o.id}`}
              titulo={o.titulo}
              empresa={o.empresa_nombre}
              rubros={o.rubros_coincidentes ?? []}
              modalidad={o.modalidad}
              lugar={o.lugar}
              descripcion={o.descripcion}
              jornada={o.jornada}
              badges={<BadgeCoincidencia nivel={o.nivel} puntaje={o.puntaje} />}
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
