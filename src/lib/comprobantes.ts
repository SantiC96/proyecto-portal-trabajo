import "server-only";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { logError } from "@/lib/logger";
import { err, errConRef, fromSupabaseError, type Resultado, type ResultadoError } from "@/lib/resultado";
import {
  COMPROBANTE_MAX_SIZE,
  ERRORES_ARCHIVO,
  detectarMimeType,
  validarTipoComprobante,
  type ComprobanteMimeType,
} from "@/lib/archivos";
import { descartarArchivoSubido } from "@/lib/archivos-servidor";
import { esEstadoComprobante, type EstadoComprobante } from "@/lib/procedencia";
import type { ClienteSupabase } from "@/types/db";

// Comprobante de domicilio de Funes (migration_055). Se sube solo desde el
// servidor al bucket privado 'comprobantes' y se lee con URLs firmadas: las
// políticas del bucket dejan leerlo al postulante dueño y a la oficina.

const BUCKET = "comprobantes";

const COLUMNAS_COMPROBANTE =
  "id, ruta, nombre_original, creado_en, tamano, mime_type, verificacion_estado, verificacion_motivo, verificado_en" as const;

/** El comprobante vigente como lo muestran las pantallas. */
export type ComprobanteVista = {
  id: string;
  nombreOriginal: string;
  subidoEn: string;
  tamano: number;
  esImagen: boolean;
  estado: EstadoComprobante;
  motivo: string | null;
  revisadoEn: string | null;
  url: string | null;
};

/**
 * Comprobante vigente de un usuario con su URL firmada, o null si no tiene.
 * Con el cliente del usuario, RLS y las políticas del bucket deciden qué ve.
 */
export async function obtenerComprobanteVigente(
  supabase: ClienteSupabase,
  usuarioId: string,
  segundos: number,
): Promise<ComprobanteVista | null> {
  const { data, error } = await supabase
    .from("archivos_usuario")
    .select(COLUMNAS_COMPROBANTE)
    .eq("usuario_id", usuarioId)
    .eq("tipo", "comprobante_domicilio")
    .is("eliminado_en", null)
    .maybeSingle();

  if (error) {
    logError("obtenerComprobanteVigente", error, { usuarioId });
    return null;
  }
  if (!data || !esEstadoComprobante(data.verificacion_estado)) return null;

  const { data: firmada } = await supabase.storage.from(BUCKET).createSignedUrl(data.ruta, segundos);

  return {
    id: data.id,
    nombreOriginal: data.nombre_original,
    subidoEn: data.creado_en,
    tamano: data.tamano,
    esImagen: data.mime_type !== "application/pdf",
    estado: data.verificacion_estado,
    motivo: data.verificacion_motivo,
    revisadoEn: data.verificado_en,
    url: firmada?.signedUrl ?? null,
  };
}

/** Estado del comprobante vigente de varios usuarios (listados de la oficina). */
export async function estadosDeComprobantes(
  supabase: ClienteSupabase,
  usuarioIds: string[],
): Promise<Map<string, EstadoComprobante>> {
  const estados = new Map<string, EstadoComprobante>();
  if (usuarioIds.length === 0) return estados;

  const { data, error } = await supabase
    .from("archivos_usuario")
    .select("usuario_id, verificacion_estado")
    .in("usuario_id", usuarioIds)
    .eq("tipo", "comprobante_domicilio")
    .is("eliminado_en", null);

  if (error) {
    logError("estadosDeComprobantes", error);
    return estados;
  }
  for (const fila of data) {
    if (esEstadoComprobante(fila.verificacion_estado)) {
      estados.set(fila.usuario_id, fila.verificacion_estado);
    }
  }
  return estados;
}

export type ComprobanteValidado = {
  buffer: ArrayBuffer;
  mime: ComprobanteMimeType;
  nombre: string;
  tamano: number;
};

/**
 * Las mismas validaciones que el resto de los archivos (src/lib/archivos.ts):
 * nombre, tipo declarado, tamaño y firma real del archivo.
 */
export async function validarComprobante(
  file: File | null,
): Promise<{ ok: true; archivo: ComprobanteValidado } | ResultadoError> {
  if (!file || file.size === 0) return err("ARCHIVO_INVALIDO", ERRORES_ARCHIVO.vacio);
  if (file.name.length > 200) return err("ARCHIVO_INVALIDO", ERRORES_ARCHIVO.nombreLargo);
  if (!validarTipoComprobante(file.type)) {
    return err("ARCHIVO_INVALIDO", ERRORES_ARCHIVO.comprobanteTipo);
  }
  if (file.size > COMPROBANTE_MAX_SIZE) {
    return err("ARCHIVO_INVALIDO", ERRORES_ARCHIVO.comprobanteTamano);
  }

  const buffer = await file.arrayBuffer();
  const inicio = new Uint8Array(buffer, 0, Math.min(12, buffer.byteLength));
  const tipoVerificado = detectarMimeType(inicio);
  if (!tipoVerificado || !validarTipoComprobante(tipoVerificado)) {
    return err("ARCHIVO_INVALIDO", ERRORES_ARCHIVO.comprobanteFirma);
  }

  return {
    ok: true,
    archivo: {
      buffer,
      mime: tipoVerificado,
      nombre: file.name.replace(/[\x00-\x1f\x7f]/g, ""),
      tamano: file.size,
    },
  };
}

const EXTENSION: Record<ComprobanteMimeType, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * Sube el comprobante y lo registra como el vigente del usuario (el anterior
 * pasa a eliminado, activar_archivo_usuario de migration_055). La base
 * rechaza el registro si la localidad del postulante no es Funes (P0001).
 * Llamarla solo después de validar quién es el usuario.
 */
export async function guardarComprobanteDomicilio(
  usuarioId: string,
  archivo: ComprobanteValidado,
  contexto: string,
): Promise<Resultado<void>> {
  const ruta = `${usuarioId}/comprobante-${Date.now()}.${EXTENSION[archivo.mime]}`;

  const { error: errorSubida } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(ruta, archivo.buffer, { contentType: archivo.mime });

  if (errorSubida) {
    const ref = logError(`${contexto}:upload`, errorSubida, { usuarioId });
    return errConRef("ERROR_INTERNO", "Error al subir el comprobante. Intentá de nuevo.", ref);
  }

  const { error: errorRegistro } = await supabaseAdmin.rpc("activar_archivo_usuario", {
    p_usuario_id: usuarioId,
    p_tipo: "comprobante_domicilio",
    p_ruta: ruta,
    p_nombre_original: archivo.nombre,
    p_tamano: archivo.tamano,
    p_mime_type: archivo.mime,
  });

  if (errorRegistro) {
    await descartarArchivoSubido(BUCKET, ruta, contexto);
    if (errorRegistro.code === "P0001") return fromSupabaseError(errorRegistro);
    const ref = logError(`${contexto}:rpc`, errorRegistro, { usuarioId });
    return errConRef("ERROR_INTERNO", "Error al guardar el comprobante. Intentá de nuevo.", ref);
  }

  return { ok: true };
}
