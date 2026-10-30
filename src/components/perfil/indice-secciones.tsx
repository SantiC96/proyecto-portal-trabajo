"use client";

import { useEffect, useRef, useState } from "react";
import {
  Briefcase,
  Camera,
  CircleAlert,
  CircleCheck,
  FileText,
  Hash,
  IdCard,
  Lock,
  MapPin,
  Tag,
  type LucideIcon,
} from "lucide-react";
import { SECCION_PERFIL } from "@/lib/perfil-secciones";
import { cn } from "@/lib/utils";

export type EstadoSeccion = "completa" | "incompleta";

type Seccion = {
  id: string;
  titulo: string;
  /** Sin estado (Contraseña): no lleva tilde ni alerta. */
  estado?: EstadoSeccion;
};

const ICONO_SECCION: Record<string, LucideIcon> = {
  [SECCION_PERFIL.foto]: Camera,
  [SECCION_PERFIL.datos]: IdCard,
  [SECCION_PERFIL.procedencia]: MapPin,
  [SECCION_PERFIL.informacionLaboral]: Briefcase,
  [SECCION_PERFIL.rubros]: Tag,
  [SECCION_PERFIL.cvs]: FileText,
  [SECCION_PERFIL.contrasena]: Lock,
};

const TEXTO_ESTADO: Record<EstadoSeccion, string> = {
  completa: "completa",
  incompleta: "le falta completar",
};

function prefiereMenosMovimiento(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Índice "En esta página" de Mi perfil. En pantallas anchas, una tarjeta
 * (la página la deja fija al hacer scroll); en angostas, pastillas con scroll
 * horizontal. Marca con aria-current la sección que se está viendo: la
 * primera cuyo título pasó la franja superior de la pantalla.
 */
export function IndiceSecciones({ secciones }: { secciones: Seccion[] }) {
  const [actual, setActual] = useState(secciones[0]?.id ?? null);
  const fila = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const elementos = secciones
      .map((s) => document.getElementById(s.id))
      .filter((e): e is HTMLElement => e !== null);
    if (elementos.length === 0) return;

    const visibles = new Set<string>();
    const observador = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (e.isIntersecting) visibles.add(e.target.id);
          else visibles.delete(e.target.id);
        }
        // La primera sección visible en el orden de la página.
        const primera = secciones.find((s) => visibles.has(s.id));
        if (primera) setActual(primera.id);
      },
      // Cuenta como "a la vista" lo que está en el 40 % superior de la pantalla.
      { rootMargin: "0px 0px -60% 0px" },
    );
    elementos.forEach((e) => observador.observe(e));
    return () => observador.disconnect();
  }, [secciones]);

  // En el celular, la pastilla actual se desplaza a la vista (solo en horizontal).
  useEffect(() => {
    const contenedor = fila.current;
    if (!contenedor || contenedor.offsetParent === null || !actual) return;
    const pastilla = contenedor.querySelector<HTMLElement>(`[data-seccion="${actual}"]`);
    if (!pastilla) return;
    const izquierda = pastilla.offsetLeft - contenedor.offsetLeft - 16;
    contenedor.scrollTo({ left: izquierda, behavior: prefiereMenosMovimiento() ? "auto" : "smooth" });
  }, [actual]);

  return (
    <>
      {/* Pantallas anchas */}
      <nav
        aria-labelledby="indice-perfil-titulo"
        className="tarjeta hidden flex-col gap-2 p-3 @3xl:flex"
      >
        <p
          id="indice-perfil-titulo"
          className="px-3 pt-1 text-[13px] font-extrabold tracking-[0.06em] text-neutral uppercase"
        >
          En esta página
        </p>
        <ul className="flex flex-col gap-0.5">
          {secciones.map((s) => {
            const activa = s.id === actual;
            const Icono = ICONO_SECCION[s.id] ?? Hash;
            return (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  aria-current={activa ? "true" : undefined}
                  onClick={() => setActual(s.id)}
                  className={cn(
                    "flex min-h-11 items-center gap-2.5 rounded-[var(--radius-md)] px-3 text-[15px] font-semibold outline-none transition-colors duration-150 focus-visible:shadow-[var(--sombra-foco)] motion-reduce:transition-none",
                    activa
                      ? "bg-primary/10 font-bold text-primary-hover"
                      : "text-muted-foreground-strong hover:bg-secondary hover:text-primary-hover",
                  )}
                >
                  <Icono className="size-[18px] shrink-0" aria-hidden="true" />
                  <span className="min-w-0 flex-1">{s.titulo}</span>
                  <IconoEstado estado={s.estado} />
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Celular y pantallas angostas */}
      <nav aria-label="En esta página" className="@3xl:hidden">
        <ul
          ref={fila}
          className="-mx-4 flex gap-2 overflow-x-auto px-4 py-1 [scrollbar-width:none] sm:-mx-6 sm:px-6 [&::-webkit-scrollbar]:hidden"
        >
          {secciones.map((s) => {
            const activa = s.id === actual;
            const Icono = ICONO_SECCION[s.id] ?? Hash;
            return (
              <li key={s.id} data-seccion={s.id} className="shrink-0">
                <a
                  href={`#${s.id}`}
                  aria-current={activa ? "true" : undefined}
                  onClick={() => setActual(s.id)}
                  className={cn(
                    "inline-flex min-h-11 items-center gap-2 rounded-full border-[1.5px] px-4 text-[15px] font-semibold whitespace-nowrap outline-none focus-visible:shadow-[var(--sombra-foco)]",
                    activa
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border-campo bg-surface text-control-foreground",
                  )}
                >
                  <Icono className="size-4 shrink-0" aria-hidden="true" />
                  {s.titulo}
                  <IconoEstado estado={s.estado} sobreVerde={activa} />
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}

function IconoEstado({ estado, sobreVerde = false }: { estado?: EstadoSeccion; sobreVerde?: boolean }) {
  if (!estado) return null;
  const Icono = estado === "completa" ? CircleCheck : CircleAlert;
  return (
    <>
      <Icono
        aria-hidden="true"
        className={cn(
          "size-[18px] shrink-0",
          sobreVerde
            ? "text-primary-foreground"
            : estado === "completa"
              ? "text-primary"
              : "text-pendiente-icono",
        )}
      />
      <span className="sr-only"> ({TEXTO_ESTADO[estado]})</span>
    </>
  );
}
