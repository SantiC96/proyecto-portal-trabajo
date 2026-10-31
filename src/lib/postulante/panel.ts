import "server-only";

import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { obtenerUsuarioActual } from "@/lib/auth";
import { logError } from "@/lib/logger";
import { TAMANO_PAGINA } from "@/lib/paginacion";
import { anclaPostulacion } from "@/lib/mis-postulaciones";
import { hrefSeccionPerfil, SECCION_PERFIL } from "@/lib/perfil-secciones";
import { esEstadoComprobante } from "@/lib/procedencia";
import type {
  FilaIndicadoresPostulante,
  FilaMiInvitacion,
  FilaMovimientoPostulante,
  FilaOfertaRecomendada,
  Tabla,
} from "@/types/db";

// Datos del panel del postulante (/panel, docs/decisiones/029). Los números y
// las ofertas recomendadas se calculan en la base (migration_058); el
// postulante sale de la sesión dentro de cada función. El resto se lee con el
// cliente del usuario (RLS). El inicio (/) usa las mismas funciones para
// "Tu actividad".

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

/** Conteo de notificaciones no leídas para decidir si el postulante está al día. */
export const obtenerNotificacionesNoLeidasPostulante = cache(
    (): Promise<ConError<number>> =>
      seguro(async () => {
        const usuario = await obtenerUsuarioActual();
        if (!usuario) return { data: null, error: "sin sesión de usuario" };

        const supabase = await createSupabaseServerClient();
        const { count, error } = await supabase
          .from("notificaciones")
          .select("id", { count: "exact", head: true })
          .eq("usuario_id", usuario.id)
          .is("leida_en", null);

        if (error) return { data: null, error };
        return { data: count ?? 0, error: null };
      }),
);

export const OFERTAS_RECOMENDADAS = 5;

export type OfertaRecomendada = FilaOfertaRecomendada &
  Partial<Pick<Tabla<"ofertas">, "descripcion" | "jornada">>;

/**
 * Las recomendadas, en el orden de la base. La función no trae la descripción
 * ni la jornada de la tarjeta detallada: salen de una segunda consulta a
 * ofertas (RLS). Si esa consulta falla o no trae alguna oferta, las tarjetas
 * se muestran sin esos datos, como en /ofertas.
 */
export function obtenerOfertasRecomendadas(): Promise<ConError<OfertaRecomendada[]>> {
  return seguro(async () => {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc("ofertas_recomendadas_para_mi", {
      p_limite: OFERTAS_RECOMENDADAS,
    });
    if (error) return { data: null, error };
    const filas: FilaOfertaRecomendada[] = data ?? [];
    if (filas.length === 0) return { data: [], error: null };

    const { data: detalles, error: errorDetalles } = await supabase
      .from("ofertas")
      .select("id, descripcion, jornada")
      .in(
        "id",
        filas.map((f) => f.id),
      );
    if (errorDetalles) logError("panel_postulante:ofertas_detalle", errorDetalles);

    const porId = new Map((detalles ?? []).map((d) => [d.id, d]));
    return {
      data: filas.map((f) => {
        const detalle = porId.get(f.id);
        return { ...f, descripcion: detalle?.descripcion, jornada: detalle?.jornada };
      }),
      error: null,
    };
  });
}

// ── Invitaciones pendientes ─────────────────────────────────────────────────

/**
 * Invitaciones pendientes, la más reciente primero. Salen de
 * mis_invitaciones (migration_056), la misma función que usa /invitaciones.
 * Dan el detalle del aviso de invitaciones y la marca "Te invitaron" de las
 * tarjetas del inicio; el número del aviso sigue saliendo de los indicadores.
 */
export const obtenerInvitacionesPendientes = cache(
  (): Promise<ConError<FilaMiInvitacion[]>> =>
    seguro(async () => {
      const supabase = await createSupabaseServerClient();
      const { data, error } = await supabase.rpc("mis_invitaciones");
      if (error) return { data: null, error };
      const filas: FilaMiInvitacion[] = data ?? [];
      return {
        data: filas
          .filter((i) => i.estado === "pendiente")
          .sort((a, b) => b.creada_en.localeCompare(a.creada_en)),
        error: null,
      };
    }),
);

// ── Rubros del perfil ───────────────────────────────────────────────────────

/** ids de los rubros del perfil del postulante con sesión (postulante_categorias). */
export function obtenerRubrosDelPerfil(): Promise<ConError<string[]>> {
  return seguro(async () => {
    const usuario = await obtenerUsuarioActual();
    if (!usuario) return { data: null, error: "sin sesión de usuario" };

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("postulantes")
      .select("postulante_categorias(categoria_id)")
      .eq("usuario_id", usuario.id)
      .maybeSingle();
    if (error) return { data: null, error };
    return { data: (data?.postulante_categorias ?? []).map((pc) => pc.categoria_id), error: null };
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

export type ItemPerfil = {
  clave: string;
  completo: boolean;
  /** Completo: qué está cargado. Pendiente: qué falta, como un pedido. */
  texto: string;
  href: string;
};

export type CompletitudPerfil = {
  items: ItemPerfil[];
  pendientes: ItemPerfil[];
  /** Ítems completos sobre el total, redondeado. */
  porcentaje: number;
  /** Rubros de interés del postulante, en orden alfabético. */
  rubros: string[];
};

function vacio(valor: string | null | undefined): boolean {
  return !valor || valor.trim() === "";
}

/** "DNI", "DNI y teléfono", "DNI, teléfono y domicilio". */
function enumerar(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;
}

/**
 * Qué tiene y qué le falta al perfil, en el orden de /perfil. No hay otra
 * lógica de completitud en el proyecto: los datos obligatorios son los que
 * pide el registro del postulante y guarda el perfil. Son siete ítems y el
 * porcentaje es completos sobre el total.
 *
 * Una sola lectura por request: la usan "Completá tu perfil" y los rubros de
 * "Ofertas para vos" en el panel, y "Tu actividad" en el inicio.
 */
export const obtenerCompletitudPerfil = cache(
  (): Promise<ConError<CompletitudPerfil>> =>
    seguro(async () => {
      const usuario = (await obtenerUsuarioActual())?.perfil;
      if (!usuario) return { data: null, error: "sin fila de usuarios" };

      const supabase = await createSupabaseServerClient();

      const [postulante, cvs, foto, comprobante] = await Promise.all([
        supabase
          .from("postulantes")
          .select(
            "dni, domicilio, localidad, es_de_funes, disponibilidad, experiencia_laboral, postulante_categorias(categorias!categoria_id(nombre))",
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

      const rubros = (p.postulante_categorias ?? [])
        .map((pc) => pc.categorias?.nombre)
        .filter((n): n is string => Boolean(n))
        .sort((a, b) => a.localeCompare(b, "es"));

      const items: ItemPerfil[] = [];
      const agregar = (clave: string, completo: boolean, texto: string, href: string) =>
        items.push({ clave, completo, texto, href });

      const datosFaltantes = [
        vacio(usuario.nombre) && "nombre",
        vacio(usuario.apellido) && "apellido",
        vacio(p.dni) && "DNI",
        vacio(usuario.telefono) && "teléfono",
        vacio(p.domicilio) && "domicilio",
      ].filter((d): d is string => typeof d === "string");
      agregar(
        "datos",
        datosFaltantes.length === 0,
        datosFaltantes.length === 0
          ? "Datos personales"
          : `Completá tus datos personales: ${enumerar(datosFaltantes)}`,
        hrefSeccionPerfil(SECCION_PERFIL.datos),
      );

      agregar(
        "foto",
        Boolean(foto.count),
        foto.count ? "Foto de perfil" : "Agregá una foto de perfil",
        hrefSeccionPerfil(SECCION_PERFIL.foto),
      );

      const conExperiencia = !vacio(p.experiencia_laboral);
      agregar(
        "experiencia",
        conExperiencia,
        conExperiencia ? "Experiencia laboral" : "Contá tu experiencia laboral",
        hrefSeccionPerfil(SECCION_PERFIL.informacionLaboral),
      );

      const conDisponibilidad = !vacio(p.disponibilidad);
      agregar(
        "disponibilidad",
        conDisponibilidad,
        conDisponibilidad ? "Disponibilidad horaria" : "Indicá tu disponibilidad horaria",
        hrefSeccionPerfil(SECCION_PERFIL.informacionLaboral),
      );

      // Localidad y comprobante son un solo ítem. Un comprobante en revisión
      // no es algo que el postulante tenga que resolver: cuenta como completo.
      const hrefProcedencia = hrefSeccionPerfil(SECCION_PERFIL.procedencia);
      if (vacio(p.localidad)) {
        agregar("procedencia", false, "Indicá tu localidad", hrefProcedencia);
      } else if (!p.es_de_funes) {
        agregar("procedencia", true, "Localidad", hrefProcedencia);
      } else {
        const verificacion = comprobante.data?.verificacion_estado;
        const estado = esEstadoComprobante(verificacion) ? verificacion : null;
        if (estado === null) {
          agregar("procedencia", false, "Subí tu comprobante de domicilio en Funes", hrefProcedencia);
        } else if (estado === "rechazado") {
          agregar(
            "procedencia",
            false,
            "Tu comprobante de domicilio fue rechazado: subí uno nuevo",
            hrefProcedencia,
          );
        } else {
          agregar(
            "procedencia",
            true,
            estado === "aprobado"
              ? "Domicilio en Funes verificado"
              : "Comprobante de domicilio en revisión",
            hrefProcedencia,
          );
        }
      }

      agregar(
        "intereses",
        rubros.length > 0,
        rubros.length > 0
          ? "Rubros de interés"
          : "Elegí los rubros en los que te interesa trabajar",
        hrefSeccionPerfil(SECCION_PERFIL.rubros),
      );

      agregar(
        "cv",
        Boolean(cvs.count),
        cvs.count ? "CV cargado" : "Subí al menos un CV",
        hrefSeccionPerfil(SECCION_PERFIL.cvs),
      );

      const completos = items.filter((i) => i.completo).length;
      return {
        data: {
          items,
          pendientes: items.filter((i) => !i.completo),
          porcentaje: Math.round((completos / items.length) * 100),
          rubros,
        },
        error: null,
      };
    }),
);
