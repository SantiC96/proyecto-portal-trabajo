export const TAMANO_PAGINA = 20;

// Tope para que el desplazamiento (pagina × tamaño) entre siempre en un int de
// Postgres. Una página mayor que la última real se corrige en consultarPagina.
const PAGINA_MAXIMA = 10_000;

// Parámetros que disparan avisos o redirecciones de una sola vez; no se
// arrastran al cambiar de página ni de búsqueda.
const PARAMETROS_TRANSITORIOS = ["aviso", "redirectTo", "accion"];

export type ValorParam = string | string[] | undefined;
export type ParamsUrl = Record<string, ValorParam>;

function primerValor(valor: ValorParam): string | undefined {
  return Array.isArray(valor) ? valor[0] : valor;
}

export function leerPagina(valor: ValorParam): number {
  const texto = primerValor(valor)?.trim();
  if (!texto || !/^\d{1,6}$/.test(texto)) return 1;
  const pagina = Number(texto);
  if (pagina < 1) return 1;
  return Math.min(pagina, PAGINA_MAXIMA);
}

export function rangoDePagina(pagina: number, tamano = TAMANO_PAGINA) {
  const desde = (pagina - 1) * tamano;
  return { desde, hasta: desde + tamano - 1 };
}

export function calcularTotalPaginas(total: number, tamano = TAMANO_PAGINA) {
  return Math.max(1, Math.ceil(total / tamano));
}

/**
 * Arma un href a `ruta` conservando los searchParams actuales y aplicando
 * `cambios` (null o "" borra la clave). La página 1 no se escribe en la URL.
 */
export function hrefConParams(
  ruta: string,
  actuales: ParamsUrl | URLSearchParams,
  cambios: Record<string, string | number | null | undefined> = {},
  ancla?: string,
): string {
  const params = new URLSearchParams();
  if (actuales instanceof URLSearchParams) {
    actuales.forEach((valor, clave) => params.append(clave, valor));
  } else {
    for (const [clave, valor] of Object.entries(actuales)) {
      if (Array.isArray(valor)) valor.forEach((v) => params.append(clave, v));
      else if (valor !== undefined) params.set(clave, valor);
    }
  }
  for (const clave of PARAMETROS_TRANSITORIOS) params.delete(clave);
  for (const [clave, valor] of Object.entries(cambios)) {
    if (valor === null || valor === undefined || valor === "") params.delete(clave);
    else params.set(clave, String(valor));
  }
  if (params.get("pagina") === "1") params.delete("pagina");

  const qs = params.toString();
  return `${ruta}${qs ? `?${qs}` : ""}${ancla ? `#${ancla}` : ""}`;
}

export type ErrorConsulta = { code?: string; message?: string };

type RespuestaConsulta<T> = {
  data: T[] | null;
  count: number | null;
  error: ErrorConsulta | null;
};

export type ResultadoPagina<T> =
  | { ok: true; filas: T[]; total: number; pagina: number; totalPaginas: number }
  | { ok: false; error: ErrorConsulta };

// PostgREST responde 416 (PGRST103) cuando el offset supera el total de filas.
const CODIGO_RANGO_INVALIDO = "PGRST103";

/**
 * Ejecuta `consultar` con el rango de `paginaPedida`. Si la página no existe
 * (por ejemplo ?pagina=999), vuelve a consultar la última página válida en vez
 * de devolver un error. `consultar` debe armar una consulta nueva en cada
 * llamada y pedir el total (count: "exact" o el total de la función).
 */
export async function consultarPagina<T>(
  paginaPedida: number,
  consultar: (desde: number, hasta: number) => PromiseLike<RespuestaConsulta<T>>,
  tamano = TAMANO_PAGINA,
): Promise<ResultadoPagina<T>> {
  const exito = (filas: T[], total: number, pagina: number): ResultadoPagina<T> => ({
    ok: true,
    filas,
    total,
    pagina,
    totalPaginas: calcularTotalPaginas(total, tamano),
  });

  const { desde, hasta } = rangoDePagina(paginaPedida, tamano);
  const primera = await consultar(desde, hasta);

  const rangoInvalido = primera.error?.code === CODIGO_RANGO_INVALIDO;
  if (primera.error && !rangoInvalido) return { ok: false, error: primera.error };

  const filas = primera.data ?? [];
  if (!rangoInvalido && (filas.length > 0 || paginaPedida === 1)) {
    return exito(filas, primera.count ?? filas.length, paginaPedida);
  }

  let total = rangoInvalido ? null : primera.count;
  if (total === null) {
    const conteo = await consultar(0, 0);
    if (conteo.error) return { ok: false, error: conteo.error };
    total = conteo.count ?? 0;
  }
  if (total === 0) return exito([], 0, 1);

  const ultima = calcularTotalPaginas(total, tamano);
  const rango = rangoDePagina(ultima, tamano);
  const final = await consultar(rango.desde, rango.hasta);
  if (final.error) return { ok: false, error: final.error };
  return exito(final.data ?? [], final.count ?? total, ultima);
}
