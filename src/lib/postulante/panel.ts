import "server-only";

import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { TAMANO_PAGINA } from "@/lib/paginacion";
import { anclaPostulacion } from "@/lib/mis-postulaciones";
import { hrefSeccionPerfil, SECCION_PERFIL } from "@/lib/perfil-secciones";
import { esEstadoComprobante } from "@/lib/procedencia";
import type {
  FilaIndicadoresPostulante,
  FilaMovimientoPostulante,
  FilaOfertaRecomendada,
  Tabla,
} from "@/types/db";

// Datos del panel del postulante (/panel, docs/decisiones/029). Los números y
// las ofertas recomendadas se calculan en la base (migration_058); el
// postulante sale de la sesión dentro de cada función. El resto se lee con el
// cliente del usuario (RLS).

type ConError<T> = { data: T; error: null } | { data: null; error: unknown };

/**
 * Cada bloque del panel carga por separado y muestra su propio error: una
 * excepción (por ejemplo, de red) se devuelve como error en vez de romper la
 * página.
 */
async function seguro<T>(cargar: () => Promise<ConError<T>>): Promise<ConError<T>> {
  try {
    return await cargar();
  } catch (error) {
    return { data: null, error };
  }
}

/** Una sola llamada por request: la usan los indicadores y el aviso de invitaciones. */
export const obtenerIndicadoresPostulante = cache(
  (): Promise<ConError<FilaIndicadoresPostulante>> =>
    seguro(async () => {
      const supabase = await createSupabaseServerClient();
      const { data, error } = await supabase.rpc("indicadores_postulante").maybeSingle();
      if (error || !data) return { data: null, error: error ?? "sin datos" };
      return { data, error: null };
    }),
);

export const OFERTAS_RECOMENDADAS = 5;

export function obtenerOfertasRecomendadas(): Promise<ConError<FilaOfertaRecomendada[]>> {
  return seguro(async () => {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc("ofertas_recomendadas_para_mi", {
      p_limite: OFERTAS_RECOMENDADAS,
    });
    if (error) return { data: null, error };
    return { data: data ?? [], error: null };
  });
}

// ── Últimos movimientos ─────────────────────────────────────────────────────

export const CANTIDAD_MOVIMIENTOS = 5;

export type Movimiento = {
  postulacionId: string;
  estado: FilaMovimientoPostulante["estado"];
  /** Resultado de la empresa; null sin derivación. */
  estadoEmpresa: FilaMovimientoPostulante["estado_empresa"];
  /** Estado de la oferta como lo lee Mis postulaciones (RLS); null si no la puede leer. */
  ofertaEstado: Tabla<"ofertas">["estado"] | null;
  /** La oferta ya no se puede leer (eliminada): el badge la muestra cerrada. */
  ofertaNoVisible: boolean;
  fechaEntrevista: string | null;
  /** Último cambio de la postulación o de su derivación. */
  fecha: string;
  oferta: { titulo: string; empresaNombre: string | null };
  /** La postulación dentro de Mis postulaciones, en su página. */
  href: string;
};

/**
 * Los movimientos salen de ultimos_movimientos_postulante (migration_058):
 * la fecha es la última actualización de la postulación o de su derivación,
 * así que una entrevista o un resultado de la empresa también cuentan.
 *
 * Para el link se lee, en una sola consulta, el orden de Mis postulaciones
 * y se calcula en qué página está cada una. La misma consulta trae el estado
 * de la oferta con la misma lectura que Mis postulaciones, para que el badge
 * sea el mismo en las dos pantallas.
 */
export function obtenerUltimosMovimientos(postulanteId: string): Promise<ConError<Movimiento[]>> {
  return seguro(async () => {
    const supabase = await createSupabaseServerClient();
    const [movimientos, orden] = await Promise.all([
      supabase.rpc("ultimos_movimientos_postulante", { p_limite: CANTIDAD_MOVIMIENTOS }),
      supabase
        .from("postulaciones")
        .select("id, ofertas(estado)")
        .eq("postulante_id", postulanteId)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false }),
    ]);

    if (movimientos.error) return { data: null, error: movimientos.error };
    if (orden.error) return { data: null, error: orden.error };

    const filasOrden = orden.data ?? [];
    const indice = new Map(filasOrden.map((fila, i) => [fila.id, i]));
    const filas: FilaMovimientoPostulante[] = movimientos.data ?? [];

    return {
      data: filas.map((m) => {
        const posicion = indice.get(m.postulacion_id);
        const pagina = Math.floor((posicion ?? 0) / TAMANO_PAGINA) + 1;
        const filaOrden = posicion === undefined ? undefined : filasOrden[posicion];
        return {
          postulacionId: m.postulacion_id,
          estado: m.estado,
          estadoEmpresa: m.estado_empresa,
          ofertaEstado: filaOrden?.ofertas?.estado ?? null,
          ofertaNoVisible: filaOrden !== undefined && filaOrden.ofertas === null,
          fechaEntrevista: m.fecha_entrevista,
          fecha: m.fecha,
          oferta: { titulo: m.titulo, empresaNombre: m.empresa_nombre },
          href: `/mis-postulaciones${pagina > 1 ? `?pagina=${pagina}` : ""}#${anclaPostulacion(m.postulacion_id)}`,
        };
      }),
      error: null,
    };
  });
}

// ── Completá tu perfil ──────────────────────────────────────────────────────

export type PendientePerfil = { clave: string; texto: string; href: string };

function vacio(valor: string | null | undefined): boolean {
  return !valor || valor.trim() === "";
}

/** "DNI", "DNI y teléfono", "DNI, teléfono y domicilio". */
function enumerar(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;
}

/**
 * Lo que le falta al perfil, en el orden de /perfil. No hay otra lógica de
 * completitud en el proyecto: los datos obligatorios son los que pide el
 * registro del postulante y guarda el perfil.
 */
export function obtenerPendientesPerfil(
  usuario: Pick<Tabla<"usuarios">, "id" | "nombre" | "apellido" | "telefono">,
): Promise<ConError<PendientePerfil[]>> {
  return seguro(async () => {
    const supabase = await createSupabaseServerClient();

    const [postulante, cvs, foto, comprobante] = await Promise.all([
      supabase
        .from("postulantes")
        .select(
          "dni, domicilio, localidad, es_de_funes, disponibilidad, experiencia_laboral, postulante_categorias(categoria_id)",
        )
        .eq("usuario_id", usuario.id)
        .maybeSingle(),
      supabase
        .from("archivos_usuario")
        .select("id", { count: "exact", head: true })
        .eq("usuario_id", usuario.id)
        .eq("tipo", "cv")
        .is("eliminado_en", null),
      supabase
        .from("archivos_usuario")
        .select("id", { count: "exact", head: true })
        .eq("usuario_id", usuario.id)
        .eq("tipo", "avatar")
        .eq("activo", true),
      supabase
        .from("archivos_usuario")
        .select("verificacion_estado")
        .eq("usuario_id", usuario.id)
        .eq("tipo", "comprobante_domicilio")
        .is("eliminado_en", null)
        .maybeSingle(),
    ]);

    const error = postulante.error ?? cvs.error ?? foto.error ?? comprobante.error;
    if (error) return { data: null, error };
    const p = postulante.data;
    if (!p) return { data: null, error: "sin fila de postulantes" };

    const pendientes: PendientePerfil[] = [];

    const datosFaltantes = [
      vacio(usuario.nombre) && "nombre",
      vacio(usuario.apellido) && "apellido",
      vacio(p.dni) && "DNI",
      vacio(usuario.telefono) && "teléfono",
      vacio(p.domicilio) && "domicilio",
    ].filter((d): d is string => typeof d === "string");
    if (datosFaltantes.length > 0) {
      pendientes.push({
        clave: "datos",
        texto: `Completá tus datos personales: ${enumerar(datosFaltantes)}`,
        href: hrefSeccionPerfil(SECCION_PERFIL.datos),
      });
    }

    if (!foto.count) {
      pendientes.push({
        clave: "foto",
        texto: "Agregá una foto de perfil",
        href: hrefSeccionPerfil(SECCION_PERFIL.foto),
      });
    }

    if (vacio(p.experiencia_laboral)) {
      pendientes.push({
        clave: "experiencia",
        texto: "Contá tu experiencia laboral",
        href: hrefSeccionPerfil(SECCION_PERFIL.informacionLaboral),
      });
    }

    if (vacio(p.disponibilidad)) {
      pendientes.push({
        clave: "disponibilidad",
        texto: "Indicá tu disponibilidad horaria",
        href: hrefSeccionPerfil(SECCION_PERFIL.informacionLaboral),
      });
    }

    if (vacio(p.localidad)) {
      pendientes.push({
        clave: "localidad",
        texto: "Indicá tu localidad",
        href: hrefSeccionPerfil(SECCION_PERFIL.procedencia),
      });
    } else if (p.es_de_funes) {
      // Pendiente de revisión no es algo que el postulante tenga que resolver.
      const verificacion = comprobante.data?.verificacion_estado;
      const estado = esEstadoComprobante(verificacion) ? verificacion : null;
      if (estado === null) {
        pendientes.push({
          clave: "comprobante",
          texto: "Subí tu comprobante de domicilio en Funes",
          href: hrefSeccionPerfil(SECCION_PERFIL.procedencia),
        });
      } else if (estado === "rechazado") {
        pendientes.push({
          clave: "comprobante",
          texto: "Tu comprobante de domicilio fue rechazado: subí uno nuevo",
          href: hrefSeccionPerfil(SECCION_PERFIL.procedencia),
        });
      }
    }

    if ((p.postulante_categorias ?? []).length === 0) {
      pendientes.push({
        clave: "intereses",
        texto: "Elegí los rubros en los que te interesa trabajar",
        href: hrefSeccionPerfil(SECCION_PERFIL.rubros),
      });
    }

    if (!cvs.count) {
      pendientes.push({
        clave: "cv",
        texto: "Subí al menos un CV",
        href: hrefSeccionPerfil(SECCION_PERFIL.cvs),
      });
    }

    return { data: pendientes, error: null };
  });
}
