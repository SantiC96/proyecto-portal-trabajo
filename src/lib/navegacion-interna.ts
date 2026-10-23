// Pila de las pantallas del sitio visitadas en esta pestaña. La escribe
// RegistroNavegacion (dentro de AppShell) y la lee "Volver" (BotonVolver y el
// link de /auth) para decidir a dónde ir. Ver
// docs/decisiones/031-navegacion-lateral.md, punto 6.

const CLAVE = "ftl_pila_navegacion";

export const MAXIMO_ENTRADAS = 50;

export type EntradaNavegacion = {
  /** pathname + query normalizada (rutaNormalizada). */
  ruta: string;
  /**
   * Se llegó por un redirect después de una acción (enviar un formulario,
   * crear, eliminar), no por un link, el historial ni una navegación del
   * usuario hecha desde el código (marcarNavegacionDelUsuario).
   */
  trasAccion: boolean;
  /**
   * false si la entrada anterior de la pila no es la anterior del historial
   * del navegador (se llegó con "Volver" a una pantalla más atrás): entonces
   * "Volver" no puede usar router.back() para ir a ella.
   */
  anteriorEnHistorial?: boolean;
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
  return (
    typeof e.ruta === "string" &&
    typeof e.trasAccion === "boolean" &&
    (e.anteriorEnHistorial === undefined || typeof e.anteriorEnHistorial === "boolean")
  );
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
    // Sin sessionStorage, "Volver" usa siempre su href.
  }
}

// ── Navegaciones del usuario hechas desde el código ─────────────────────────
// Un clic en un <a> lo detecta RegistroNavegacion. Un router.push del código
// que responde a un gesto del usuario (buscar, cancelar, abrir una fila) se
// marca con marcarNavegacionDelUsuario() antes del push: cuenta como un link
// y no como el redirect de una acción.

let ultimaNavegacionDelUsuario = 0;

export function marcarNavegacionDelUsuario(): void {
  ultimaNavegacionDelUsuario = Date.now();
}

/** Devuelve cuándo fue la última navegación del usuario y la olvida. */
export function tomarNavegacionDelUsuario(): number {
  const valor = ultimaNavegacionDelUsuario;
  ultimaNavegacionDelUsuario = 0;
  return valor;
}

// ── "Volver" a una pantalla que no es la inmediata ──────────────────────────
// Se navega con router.push y RegistroNavegacion recorta la pila hasta esa
// entrada, en lugar de apilarla.

let saltoPendiente: { ruta: string; indice: number; en: number } | null = null;

/** Devuelve el salto hacia atrás pendiente (si es de hace poco) y lo olvida. */
export function tomarSaltoPendiente(): { ruta: string; indice: number; en: number } | null {
  const valor = saltoPendiente;
  saltoPendiente = null;
  return valor;
}

/** Pantallas de un formulario que, al enviarse, redirige a otra. */
const RUTA_FORMULARIO = /\/(nueva|nuevo|editar)$|^\/empresa\/solicitud$/;

export function sinQuery(ruta: string): string {
  const corte = ruta.indexOf("?");
  return corte === -1 ? ruta : ruta.slice(0, corte);
}

export function esRutaAuth(pathname: string): boolean {
  return pathname === "/auth" || pathname.startsWith("/auth/");
}

export type DestinoVolver =
  | { tipo: "historial" }
  | { tipo: "ruta"; ruta: string; indice: number };

/**
 * A dónde lleva "Volver" según la pila, o null si no hay una pantalla
 * anterior del sitio en esta pestaña (entonces se usa el href de respaldo).
 *
 * - La pantalla actual son todas las entradas seguidas con su pathname: los
 *   cambios de pestaña, filtro o página no cuentan como pantallas distintas.
 * - Si se llegó a ella por el redirect de una acción, se saltea la pantalla
 *   donde se hizo la acción (el formulario enviado, lo que se eliminó).
 * - Se saltean los formularios, las pantallas de /auth y la propia pantalla.
 * - Si el destino es la entrada inmediata anterior del historial, router.back();
 *   si no, se navega a su ruta (con su query).
 */
export function destinoVolver(): DestinoVolver | null {
  const entradas = leerPila()?.entradas ?? [];
  const ultimo = entradas.length - 1;
  if (ultimo < 1) return null;

  const actual = entradas[ultimo];
  if (actual.ruta !== rutaNormalizada(window.location.pathname, window.location.search)) return null;
  const pathActual = sinQuery(actual.ruta);

  let i = ultimo;
  while (i >= 0 && sinQuery(entradas[i].ruta) === pathActual) i--;
  const inicioActual = i + 1;

  if (entradas[inicioActual].trasAccion && i >= 0) {
    const pantallaDeLaAccion = sinQuery(entradas[i].ruta);
    while (i >= 0 && sinQuery(entradas[i].ruta) === pantallaDeLaAccion) i--;
  }

  while (i >= 0) {
    const path = sinQuery(entradas[i].ruta);
    if (path !== pathActual && !esRutaAuth(path) && !RUTA_FORMULARIO.test(path)) break;
    i--;
  }
  if (i < 0) return null;

  const inmediata =
    i === ultimo - 1 && actual.anteriorEnHistorial !== false && window.history.length > 1;
  return inmediata ? { tipo: "historial" } : { tipo: "ruta", ruta: entradas[i].ruta, indice: i };
}

/**
 * Lleva a la pantalla anterior si la pila la conoce. Devuelve false si no la
 * hay: quien llama navega a su href de respaldo.
 */
export function volverAPantallaAnterior(router: { back: () => void; push: (href: string) => void }): boolean {
  const destino = destinoVolver();
  if (!destino) return false;
  if (destino.tipo === "historial") {
    router.back();
  } else {
    saltoPendiente = { ruta: destino.ruta, indice: destino.indice, en: Date.now() };
    router.push(destino.ruta);
  }
  return true;
}
