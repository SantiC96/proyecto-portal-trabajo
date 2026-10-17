// Alias sobre los tipos generados de Supabase (src/types/database.ts).
// database.ts no se edita a mano: se regenera con `npm run db:tipos`
// después de cada migración (ver docs/decisiones/015-tipos-y-autenticacion.md).

import type { SupabaseClient } from "@supabase/supabase-js";
import { Constants, type Database, type Json } from "@/types/database";

export type { Database, Json };

/** Cliente tipado (servidor, navegador o admin). */
export type ClienteSupabase = SupabaseClient<Database>;

type Publico = Database["public"];

export type NombreTabla = keyof Publico["Tables"];
export type NombreEnum = keyof Publico["Enums"];
export type NombreFuncion = keyof Publico["Functions"];

/** Fila de una tabla: Tabla<"ofertas">. */
export type Tabla<T extends NombreTabla> = Publico["Tables"][T]["Row"];
export type Insert<T extends NombreTabla> = Publico["Tables"][T]["Insert"];
export type Update<T extends NombreTabla> = Publico["Tables"][T]["Update"];

/** Valores de un enum de Postgres: Enum<"estado_postulacion">. */
export type Enum<E extends NombreEnum> = Publico["Enums"][E];

export type Rol = Enum<"rol_usuario">;

/** Los mismos valores, como arreglo, para validar entradas en el servidor. */
export const VALORES_ENUM = Constants.public.Enums;

export function esValorEnum<E extends NombreEnum>(
  nombre: E,
  valor: unknown,
): valor is Enum<E> {
  const valores: readonly string[] = VALORES_ENUM[nombre];
  return typeof valor === "string" && valores.includes(valor);
}

export type ArgsRpc<F extends NombreFuncion> = Publico["Functions"][F]["Args"];
export type RetornoRpc<F extends NombreFuncion> = Publico["Functions"][F]["Returns"];

/** Una fila de una función RETURNS TABLE / SETOF. */
export type FilaRpc<F extends NombreFuncion> =
  RetornoRpc<F> extends readonly (infer Fila)[] ? Fila : never;

/**
 * El generador no conoce la nulabilidad de las columnas que devuelve una
 * función (RETURNS TABLE): las marca todas como no nulas. ConNulos vuelve a
 * marcar como `| null` las que la función sí puede devolver en null.
 */
export type ConNulos<T, K extends keyof T> = Omit<T, K> & { [P in K]: T[P] | null };

// Filas de las funciones RPC que usa la app.
export type FilaOfertaPublica = ConNulos<
  FilaRpc<"buscar_ofertas_publicas">,
  "publicado_en" | "requisitos" | "beneficios" | "categorias"
>;
/** Columnas opcionales de información laboral de postulantes (migration_046). */
type CamposInformacionLaboral =
  | "nivel_educativo"
  | "situacion_laboral"
  | "disponibilidad"
  | "experiencia_laboral";
export type FilaCandidatoParaEmpresa = ConNulos<
  FilaRpc<"candidato_para_empresa">,
  "telefono" | "cv_ruta" | CamposInformacionLaboral
>;
export type FilaCandidatoParaEmpresaCompleto = ConNulos<
  FilaRpc<"candidato_para_empresa_completo">,
  "telefono" | "cv_ruta" | "foto_ruta" | CamposInformacionLaboral
>;
export type FilaDerivacionDeOfertaEmpresa = ConNulos<
  FilaRpc<"derivaciones_de_oferta_empresa">,
  "fecha_entrevista" | "fecha_respuesta" | "lugar_entrevista" | "nota_municipalidad"
>;
export type FilaDerivacionDePostulanteEmpresa = ConNulos<
  FilaRpc<"derivaciones_de_postulante_empresa">,
  "fecha_respuesta"
>;
export type FilaDerivacionSinResultado = FilaRpc<"derivaciones_sin_resultado_empresa">;
export type FilaEstadoDerivacionPostulante = ConNulos<
  FilaRpc<"estado_derivacion_postulante">,
  "fecha_entrevista" | "lugar_entrevista"
>;
export type FilaPostulacionNoSeleccionada = ConNulos<
  FilaRpc<"postulaciones_no_seleccionadas">,
  "usuario_id" | "nombre" | "apellido" | "dni" | "empresa_nombre"
>;
export type FilaEmailDeUsuario = FilaRpc<"emails_de_usuarios">;
export type FilaMiPreEntrevista = FilaRpc<"mis_pre_entrevistas">;

/** Indicadores del dashboard (migration_047): las tasas son NULL sin datos. */
export type FilaIndicadoresPortal = ConNulos<
  FilaRpc<"indicadores_portal">,
  "tasa_contratacion" | "dias_promedio_derivacion"
>;
