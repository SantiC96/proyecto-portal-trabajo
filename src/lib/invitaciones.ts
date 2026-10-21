import { formatFecha } from "@/lib/fechas";
import { leerPagina } from "@/lib/paginacion";
import { esRutaInterna } from "@/lib/redirect";
import { esUuid } from "@/lib/validaciones";

// Invitaciones de la oficina a postularse (migration_056, decisión 028).
// Los estados y el CHECK de invitaciones_oferta.motivo_rechazo están en la
// base; si cambian allá, hay que cambiarlos acá.

export const ESTADOS_INVITACION = ["pendiente", "aceptada", "rechazada", "vencida"] as const;
export type EstadoInvitacion = (typeof ESTADOS_INVITACION)[number];

export function esEstadoInvitacion(valor: unknown): valor is EstadoInvitacion {
  return ESTADOS_INVITACION.some((e) => e === valor);
}

export const MOTIVO_INVITACION_MAXIMO = 500;

/**
 * La oficina solo busca e invita para ofertas activas y vigentes: lo mismo
 * que exige invitar_a_oferta en la base (vence_en presente y futuro).
 */
export function ofertaAceptaInvitaciones(estado: string, venceEn: string | null | undefined): boolean {
  return estado === "activa" && venceEn != null && new Date(venceEn).getTime() > Date.now();
}

/**
 * Búsqueda de postulantes para una oferta (solo la oficina). `volver` es la
 * pantalla desde la que se entra; se valida al leerla (destinoVolverBusqueda).
 */
export function rutaBuscarPostulantes(
  ofertaId: string,
  params: { volver?: string | null; pagina?: number } = {},
): string {
  const query = new URLSearchParams();
  if (params.pagina && params.pagina > 1) query.set("pagina", String(params.pagina));
  if (params.volver) query.set("volver", params.volver);
  const qs = query.toString();
  return `/admin/ofertas/${ofertaId}/candidatos${qs ? `?${qs}` : ""}`;
}

export type DestinoVolver = {
  href: string;
  texto: string;
  /** El volver aceptado, para pasarlo a los links que salen de la búsqueda; null si es el de siempre. */
  param: string | null;
};

/**
 * Botón Volver de la búsqueda de postulantes. Solo acepta rutas internas que
 * sean el inicio ("/"), el listado público (/ofertas, con sus filtros), el
 * detalle público (/ofertas/<id>), el listado del panel (/admin/ofertas, con
 * sus filtros) o el detalle del panel (/admin/ofertas/<id>). Cualquier otra
 * cosa vuelve al detalle de la oferta en el panel.
 */
export function destinoVolverBusqueda(ofertaId: string, valor: unknown): DestinoVolver {
  const porDefecto: DestinoVolver = {
    href: `/admin/ofertas/${ofertaId}`,
    texto: "Volver a la oferta",
    param: null,
  };
  const crudo = Array.isArray(valor) ? valor[0] : valor;
  if (!esRutaInterna(crudo) || crudo.includes("#")) return porDefecto;

  const corte = crudo.indexOf("?");
  const ruta = corte === -1 ? crudo : crudo.slice(0, corte);
  const conQuery = corte !== -1;
  const segmentos = ruta.split("/");

  let texto: string | null = null;
  if (crudo === "/") texto = "Volver al inicio";
  else if (ruta === "/ofertas" || ruta === "/admin/ofertas") texto = "Volver a ofertas";
  else if (!conQuery && segmentos.length === 3 && segmentos[1] === "ofertas" && esUuid(segmentos[2]))
    texto = "Volver a la oferta";
  else if (
    !conQuery &&
    segmentos.length === 4 &&
    segmentos[1] === "admin" &&
    segmentos[2] === "ofertas" &&
    esUuid(segmentos[3])
  )
    texto = "Volver a la oferta";

  if (!texto) return porDefecto;
  return { href: crudo, texto, param: crudo === porDefecto.href ? null : crudo };
}

/**
 * Volver de la ficha del postulante cuando se entró desde la búsqueda de una
 * oferta: la búsqueda con su página y su propio volver, este último validado
 * con destinoVolverBusqueda. null si `valor` no es la búsqueda de una oferta.
 */
export function volverALaBusqueda(valor: unknown): string | null {
  if (!esRutaInterna(valor)) return null;
  const coincide = /^\/admin\/ofertas\/([^/?#]+)\/candidatos(?:\?([^#]*))?$/.exec(valor);
  if (!coincide || !esUuid(coincide[1])) return null;
  const ofertaId = coincide[1];
  const query = new URLSearchParams(coincide[2] ?? "");
  return rutaBuscarPostulantes(ofertaId, {
    volver: destinoVolverBusqueda(ofertaId, query.get("volver")).param,
    pagina: leerPagina(query.get("pagina") ?? undefined),
  });
}

/** Nivel de coincidencia que calcula buscar_candidatos_para_oferta. */
export type NivelCoincidencia = "alta" | "media" | "baja";

export function nivelCoincidencia(valor: string): NivelCoincidencia {
  return valor === "alta" || valor === "media" ? valor : "baja";
}

export const COINCIDENCIA: Record<NivelCoincidencia, { label: string; className: string }> = {
  alta: { label: "Alta coincidencia", className: "border-emerald-200 bg-emerald-50 text-emerald-800" },
  media: { label: "Media coincidencia", className: "border-amber-200 bg-amber-50 text-amber-900" },
  baja: { label: "Baja coincidencia", className: "border-gray-200 bg-gray-100 text-gray-700" },
};

/**
 * Estilo de la última invitación a una oferta (oficina). El texto dice lo
 * mismo que el color: azul pendiente, rojo dijo que no, gris vencida, verde
 * aceptada.
 */
export const ESTILO_INVITACION: Record<EstadoInvitacion, string> = {
  pendiente: "border-blue-200 bg-blue-50 text-blue-800",
  aceptada: "border-emerald-200 bg-emerald-50 text-emerald-800",
  rechazada: "border-red-200 bg-red-50 text-red-800",
  vencida: "border-gray-200 bg-gray-100 text-gray-700",
};

export const ETIQUETA_INVITACION: Record<EstadoInvitacion, string> = {
  pendiente: "Sin respuesta",
  aceptada: "Aceptó",
  rechazada: "Dijo que no",
  vencida: "Vencida",
};

/** "Invitado el 3/10/2026, sin respuesta", "Dijo que no el …", etc. */
export function textoUltimaInvitacion(estado: EstadoInvitacion, fecha: string | null): string {
  const el = fecha ? ` el ${formatFecha(fecha)}` : "";
  switch (estado) {
    case "pendiente":
      return `Invitado${el}, sin respuesta`;
    case "rechazada":
      return `Dijo que no${el}`;
    case "vencida":
      return `Invitación vencida${el}`;
    case "aceptada":
      return `Aceptó la invitación${el} y después retiró la postulación`;
  }
}

/** Etiqueta de las postulaciones que vienen de una invitación (postulaciones.origen). */
export const ETIQUETA_POR_INVITACION = "Por invitación";
