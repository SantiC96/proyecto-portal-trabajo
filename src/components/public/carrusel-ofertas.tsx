"use client";

import {
  Children,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
  type TouchEvent,
} from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { useMovimientoReducido } from "@/components/indicadores/use-movimiento-reducido";
import { cn } from "@/lib/utils";

type Props = {
  titulo: string;
  bajada: string;
  /** Link "Ver todas las ofertas", a la izquierda de las flechas. */
  enlace: ReactNode;
  /** Una tarjeta por elemento. */
  children: ReactNode;
};

type Medida = {
  pagina: number;
  paginas: number;
  alInicio: boolean;
  alFinal: boolean;
};

// El tiempo de leer una tarjeta (título, empresa, rubros, lugar y jornada)
// antes de que pase a la siguiente.
const INTERVALO_MS = 7000;

function suscribirVisibilidad(avisar: () => void) {
  document.addEventListener("visibilitychange", avisar);
  return () => document.removeEventListener("visibilitychange", avisar);
}

const BOTON_FLECHA =
  "inline-grid size-11 shrink-0 place-items-center rounded-full border-[1.5px] border-border-control bg-surface text-control-foreground outline-none transition-colors hover:bg-surface-tinted focus-visible:shadow-[var(--sombra-foco)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-surface";

/**
 * Carrusel de tarjetas con scroll horizontal y scroll-snap. Entran 3 tarjetas
 * con 896 px de ancho disponible, 2 desde 576 px y, más angosto, una sola
 * mostrando el borde de la siguiente (se mide el contenedor y no la ventana:
 * la sidebar le quita ancho al contenido). Las flechas desplazan una página;
 * con teclado se llega a cada tarjeta y el navegador la trae a la vista. Si
 * todas entran, no hay flechas ni puntos.
 *
 * Pase automático: cada INTERVALO_MS avanza una tarjeta y, desde la última,
 * vuelve a la primera. Se pausa mientras el mouse, el foco o un dedo están
 * sobre las tarjetas, con la pestaña oculta y con el carrusel fuera de la
 * pantalla; al terminar la causa retoma con el intervalo completo, igual que
 * después de usar las flechas. El botón de pausa lo detiene hasta que el
 * usuario lo reanude. Con movimiento reducido arranca pausado.
 */
export function CarruselOfertas({ titulo, bajada, enlace, children }: Props) {
  const idTitulo = useId();
  const pista = useRef<HTMLUListElement>(null);
  const seccion = useRef<HTMLElement>(null);
  const [medida, setMedida] = useState<Medida | null>(null);
  const items = Children.toArray(children);

  const reducido = useMovimientoReducido();
  // null: sin elección del usuario; con movimiento reducido cuenta como pausado.
  const [pausaElegida, setPausaElegida] = useState<boolean | null>(null);
  const pausadoPorUsuario = pausaElegida ?? reducido;
  const [conMouse, setConMouse] = useState(false);
  const [conFoco, setConFoco] = useState(false);
  const [conToque, setConToque] = useState(false);
  const [enPantalla, setEnPantalla] = useState(false);
  const pestanaOculta = useSyncExternalStore(
    suscribirVisibilidad,
    () => document.hidden,
    () => false,
  );
  // Cambia para volver a contar el intervalo completo.
  const [ciclo, setCiclo] = useState(0);
  const reiniciarConteo = useCallback(() => setCiclo((c) => c + 1), []);

  const pasoDePagina = useCallback(() => {
    const el = pista.current;
    const primero = el?.firstElementChild as HTMLElement | null;
    if (!el || !primero) return null;
    const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
    const paso = primero.offsetWidth + gap;
    const porVista = Math.max(1, Math.round((el.clientWidth + gap) / paso));
    return { el, paso, porVista };
  }, []);

  const medir = useCallback(() => {
    const datos = pasoDePagina();
    if (!datos) return;
    const { el, paso, porVista } = datos;
    const maximo = el.scrollWidth - el.clientWidth;
    if (maximo <= 1) {
      setMedida(null);
      return;
    }
    const paginas = Math.ceil(el.children.length / porVista);
    const alFinal = el.scrollLeft >= maximo - 1;
    const pagina = alFinal
      ? paginas - 1
      : Math.min(paginas - 1, Math.round(el.scrollLeft / (paso * porVista)));
    setMedida({ pagina, paginas, alInicio: el.scrollLeft <= 1, alFinal });
  }, [pasoDePagina]);

  useEffect(() => {
    const el = pista.current;
    if (!el) return;
    let cuadro = 0;
    const alDesplazar = () => {
      cancelAnimationFrame(cuadro);
      cuadro = requestAnimationFrame(medir);
    };
    const observador = new ResizeObserver(alDesplazar);
    observador.observe(el);
    el.addEventListener("scroll", alDesplazar, { passive: true });
    return () => {
      cancelAnimationFrame(cuadro);
      observador.disconnect();
      el.removeEventListener("scroll", alDesplazar);
    };
  }, [medir]);

  useEffect(() => {
    const el = seccion.current;
    if (!el) return;
    const observador = new IntersectionObserver(([entrada]) =>
      setEnPantalla(entrada.isIntersecting),
    );
    observador.observe(el);
    return () => observador.disconnect();
  }, []);

  const avanzarUnaTarjeta = useCallback(() => {
    const datos = pasoDePagina();
    if (!datos) return;
    const { el, paso } = datos;
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth";
    // Solo desplaza la lista: nunca mueve el foco.
    if (el.scrollLeft >= el.scrollWidth - el.clientWidth - 1) {
      el.scrollTo({ left: 0, behavior });
    } else {
      el.scrollBy({ left: paso, behavior });
    }
  }, [pasoDePagina]);

  const avanzaSolo =
    medida !== null &&
    !pausadoPorUsuario &&
    !conMouse &&
    !conFoco &&
    !conToque &&
    enPantalla &&
    !pestanaOculta;

  useEffect(() => {
    if (!avanzaSolo) return;
    const temporizador = window.setTimeout(() => {
      avanzarUnaTarjeta();
      reiniciarConteo();
    }, INTERVALO_MS);
    return () => window.clearTimeout(temporizador);
  }, [avanzaSolo, ciclo, avanzarUnaTarjeta, reiniciarConteo]);

  function desplazar(sentido: 1 | -1) {
    const datos = pasoDePagina();
    if (!datos) return;
    const reducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    datos.el.scrollBy({
      left: sentido * datos.paso * datos.porVista,
      behavior: reducido ? "auto" : "smooth",
    });
    reiniciarConteo();
  }

  function alSoltar(e: TouchEvent) {
    if (e.touches.length > 0) return;
    setConToque(false);
    reiniciarConteo();
  }

  return (
    <section
      ref={seccion}
      aria-labelledby={idTitulo}
      aria-roledescription="carrusel"
      className="@container"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 id={idTitulo} className="titulo-display text-[26px] leading-tight">
            {titulo}
          </h2>
          <p className="mt-1.5 text-base text-muted-foreground">{bajada}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {enlace}
          {medida && (
            <div className="flex gap-2">
              <button
                type="button"
                className={BOTON_FLECHA}
                aria-label={pausadoPorUsuario ? "Reanudar el carrusel" : "Pausar el carrusel"}
                aria-pressed={pausadoPorUsuario}
                aria-controls={`${idTitulo}-pista`}
                onClick={() => {
                  setPausaElegida(!pausadoPorUsuario);
                  reiniciarConteo();
                }}
              >
                {pausadoPorUsuario ? (
                  <Play className="size-5" aria-hidden="true" />
                ) : (
                  <Pause className="size-5" aria-hidden="true" />
                )}
              </button>
              <button
                type="button"
                className={BOTON_FLECHA}
                aria-label="Ofertas anteriores"
                aria-controls={`${idTitulo}-pista`}
                disabled={medida.alInicio}
                onClick={() => desplazar(-1)}
              >
                <ChevronLeft className="size-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                className={BOTON_FLECHA}
                aria-label="Ofertas siguientes"
                aria-controls={`${idTitulo}-pista`}
                disabled={medida.alFinal}
                onClick={() => desplazar(1)}
              >
                <ChevronRight className="size-5" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      </div>

      <ul
        ref={pista}
        id={`${idTitulo}-pista`}
        // El padding deja ver el foco, la elevación y la sombra de la tarjeta
        // (3 px arriba y 0 12px 28px), que el desplazamiento horizontal
        // recortaría. Los márgenes negativos lo compensan: el espacio visible
        // con el título y los puntos queda como con 4 px.
        className="sin-barra-scroll -mx-1 -mb-10 flex snap-x snap-mandatory scroll-px-1 gap-4 overflow-x-auto scroll-smooth px-1 pt-6 pb-11 motion-reduce:scroll-auto"
        // Pausas del pase automático: solo sobre las tarjetas, así el botón de
        // reanudar y las flechas funcionan aunque el mouse o el foco estén ahí.
        onPointerEnter={(e) => e.pointerType === "mouse" && setConMouse(true)}
        onPointerLeave={(e) => e.pointerType === "mouse" && setConMouse(false)}
        onFocus={() => setConFoco(true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) setConFoco(false);
        }}
        onTouchStart={() => setConToque(true)}
        onTouchEnd={alSoltar}
        onTouchCancel={alSoltar}
      >
        {items.map((item, i) => (
          <li
            key={i}
            className="flex shrink-0 basis-[85%] snap-start @xl:basis-[calc((100%_-_16px)/2)] @4xl:basis-[calc((100%_-_32px)/3)]"
          >
            <div className="w-full">{item}</div>
          </li>
        ))}
      </ul>

      {medida && (
        // Mientras avanza solo no se anuncia; cuando lo mueve el usuario, sí.
        <p className="sr-only" aria-live={avanzaSolo ? "off" : "polite"} aria-atomic="true">
          Página {medida.pagina + 1} de {medida.paginas}
        </p>
      )}

      {medida && medida.paginas > 1 && (
        <div aria-hidden="true" className="mt-5 flex items-center justify-center gap-2">
          {Array.from({ length: medida.paginas }, (_, i) => (
            <span
              key={i}
              className={cn(
                "h-2 rounded-full transition-[width,background-color] duration-200",
                i === medida.pagina ? "w-6 bg-primary" : "w-2 bg-punto-carrusel",
              )}
            />
          ))}
        </div>
      )}
    </section>
  );
}
