// Pila de las pantallas del sitio visitadas en esta pestaña. La escribe
// RegistroNavegacion (dentro de AppShell) y la lee BotonVolver para decidir si
// "Volver" puede usar el historial del navegador. Ver
// docs/decisiones/031-navegacion-lateral.md, punto 6.

const CLAVE = "ftl_pila_navegacion";

export const MAXIMO_ENTRADAS = 50;

export type EntradaNavegacion = {
  /** pathname + query normalizada (rutaNormalizada). */
  ruta: string;
  /**
   * Se llegó sin un clic en un link ni el historial: un redirect de una
   * acción (crear, enviar, eliminar) o un router.push del código.
   */
  trasAccion: boolean;
};

export type PilaNavegacion = {
  entradas: EntradaNavegacion[];
  /** history.length al guardar: si crece, la navegación agregó una entrada. */
  largoHistorial: number;
};

export function rutaNormalizada(pathname: string, query: string): string {
  const qs = new URLSearchParams(query).toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

function esEntrada(valor: unknown): valor is EntradaNavegacion {
  if (typeof valor !== "object" || valor === null) return false;
  const e = valor as Record<string, unknown>;
  return typeof e.ruta === "string" && typeof e.trasAccion === "boolean";
}

export function leerPila(): PilaNavegacion | null {
  try {
    const crudo = window.sessionStorage.getItem(CLAVE);
    if (!crudo) return null;
    const pila: unknown = JSON.parse(crudo);
    if (typeof pila !== "object" || pila === null) return null;
    const { entradas, largoHistorial } = pila as Record<string, unknown>;
    if (!Array.isArray(entradas) || typeof largoHistorial !== "number") return null;
    return { entradas: entradas.filter(esEntrada).slice(-MAXIMO_ENTRADAS), largoHistorial };
  } catch {
    return null;
  }
}

export function guardarPila(pila: PilaNavegacion): void {
  try {
    window.sessionStorage.setItem(CLAVE, JSON.stringify(pila));
  } catch {
    // Sin sessionStorage, BotonVolver usa siempre su href.
  }
}

/** Pantallas de un formulario que, al enviarse, redirige a otra. */
const RUTA_FORMULARIO = /\/(nueva|nuevo|editar)$|^\/empresa\/solicitud$/;

function sinQuery(ruta: string): string {
  const corte = ruta.indexOf("?");
  return corte === -1 ? ruta : ruta.slice(0, corte);
}

/**
 * true si "Volver" puede hacer router.back(): la pantalla actual es la última
 * de la pila, se llegó a ella con un link o con el historial, y la anterior es
 * del sitio, no es de /auth ni un formulario. Si no, BotonVolver usa su href.
 */
export function puedeVolverConHistorial(): boolean {
  if (window.history.length < 2) return false;
  const entradas = leerPila()?.entradas ?? [];
  if (entradas.length < 2) return false;

  const actual = entradas[entradas.length - 1];
  const anterior = entradas[entradas.length - 2];
  if (actual.ruta !== rutaNormalizada(window.location.pathname, window.location.search)) return false;
  if (actual.trasAccion) return false;

  const rutaAnterior = sinQuery(anterior.ruta);
  if (rutaAnterior === "/auth" || rutaAnterior.startsWith("/auth/")) return false;
  if (RUTA_FORMULARIO.test(rutaAnterior)) return false;
  return true;
}
