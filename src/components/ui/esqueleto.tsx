import type { CSSProperties, ComponentProps, ReactNode } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { BotonVolver } from "@/components/ui/boton-volver";
import { EncabezadoPagina } from "@/components/ui/encabezado-pagina";
import { DetalleConLateral } from "@/components/ui/detalle-con-lateral";
import { clasePastilla } from "@/components/ui/pastilla-filtro";
import {
  CLASE_CUADRO_ESTADO,
  CLASE_GRILLA_CUADROS,
  claseCeldaCuadro,
} from "@/components/ui/cuadro-estado";

/*
 * Esqueletos de carga. Cada pieza copia las medidas del componente real (alto,
 * radio, padding y gap) para que la pantalla no salte al terminar de cargar.
 * Regla: lo que no depende de los datos (títulos fijos, rótulos, nombres de
 * columnas, etiquetas de las pastillas) va con su texto real; solo lo que
 * depende de los datos va en gris.
 *
 * Accesibilidad: ContenedorEsqueleto marca la zona con aria-busy y un
 * "Cargando…" para lectores de pantalla; los bloques grises son aria-hidden y
 * ninguno recibe foco. El pulso se apaga con prefers-reduced-motion.
 */

const PULSO = "animate-pulse motion-reduce:animate-none";

export function Esqueleto({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <div
      className={cn(PULSO, "rounded-md bg-secondary-hover", className)}
      style={style}
      aria-hidden="true"
    />
  );
}

/** Bloque en línea: va dentro de un texto real (un número en una bajada, una cantidad). */
export function EsqueletoEnLinea({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(PULSO, "inline-block h-[0.9em] rounded bg-secondary-hover align-middle", className)}
    />
  );
}

/** Línea blanca semitransparente: lo que depende de los datos sobre la banda verde. */
export function LineaBanda({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <span
      aria-hidden="true"
      style={style}
      className={cn(
        PULSO,
        "inline-block h-[0.9em] max-w-full rounded-md bg-primary-foreground/20 align-middle",
        className,
      )}
    />
  );
}

export function EsqueletoTexto({ className }: { className?: string }) {
  return <Esqueleto className={cn("h-4 w-full", className)} />;
}

export function EsqueletoTitulo({ className }: { className?: string }) {
  return <Esqueleto className={cn("h-7 w-48 sm:w-64", className)} />;
}

export function EsqueletoTarjeta({ className }: { className?: string }) {
  return (
    <div className={cn("tarjeta p-4 sm:p-5", className)}>
      <div className="flex flex-col gap-3">
        <Esqueleto className="h-5 w-3/4" />
        <Esqueleto className="h-4 w-full" />
        <Esqueleto className="h-4 w-2/3" />
      </div>
    </div>
  );
}

export function EsqueletoLista({
  filas = 3,
  className,
}: {
  filas?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {Array.from({ length: filas }, (_, i) => (
        <EsqueletoTarjeta key={i} />
      ))}
    </div>
  );
}

// ── Contenedor ──────────────────────────────────────────────────────────────

/**
 * Zona que está cargando: aria-busy y "Cargando…" solo para lectores de
 * pantalla. Lo de adentro que es real (Volver, el título fijo) sigue accesible.
 */
export function ContenedorEsqueleto({
  children,
  className,
  como: Etiqueta = "div",
}: {
  children: ReactNode;
  className?: string;
  como?: "div" | "section" | "main";
}) {
  return (
    <Etiqueta aria-busy="true" className={className}>
      <p className="sr-only" role="status">
        Cargando…
      </p>
      {children}
    </Etiqueta>
  );
}

// ── 1. Encabezado con banda ─────────────────────────────────────────────────

/**
 * BotonVolver real y EncabezadoPagina con banda real. Va dentro del mismo
 * contenedor flex que en la página (el `className` es el de la banda, como
 * "-mt-2"). Sin `titulo` (título que sale de los datos), líneas blancas
 * semitransparentes en lugar del título, la bajada y el badge.
 */
export function EncabezadoEsqueleto({
  volver,
  volverDestacado = true,
  titulo,
  bajada,
  bajadaVariable = false,
  junto = false,
  avatar = false,
  acciones,
  accionesVariables = 0,
  botonesBlancos = false,
  className,
}: {
  /** Destino de respaldo de "Volver"; sin él, no va. */
  volver?: string;
  volverDestacado?: boolean;
  /** El título fijo real. Sin él, una línea en su lugar. */
  titulo?: ReactNode;
  /** La bajada fija real (puede llevar un EsqueletoEnLinea adentro). */
  bajada?: ReactNode;
  /** La bajada depende de los datos: una línea en su lugar. Un número cambia el ancho (em). */
  bajadaVariable?: boolean | number;
  /** Badge al lado del título (el estado). */
  junto?: boolean;
  /** Logo o iniciales a la izquierda del título. */
  avatar?: boolean;
  /** Botones fijos reales. */
  acciones?: ReactNode;
  /** Cantidad de botones que dependen del estado: van como bloques. */
  accionesVariables?: number;
  botonesBlancos?: boolean;
  className?: string;
}) {
  const anchoBajada = typeof bajadaVariable === "number" ? bajadaVariable : 22;
  const botones =
    accionesVariables > 0
      ? Array.from({ length: accionesVariables }, (_, i) => (
          <LineaBanda key={i} className="h-11 w-full rounded-[var(--radius-md)] sm:w-36" />
        ))
      : null;

  return (
    <>
      {volver && <BotonVolver href={volver} destacado={volverDestacado} />}
      <EncabezadoPagina
        banda
        botonesBlancos={botonesBlancos}
        className={className}
        avatar={
          avatar ? (
            <LineaBanda className="size-14 shrink-0 rounded-full sm:size-[72px]" />
          ) : undefined
        }
        titulo={
          titulo ?? (
            <>
              <span className="sr-only">Cargando…</span>
              <LineaBanda className="w-[9em]" />
            </>
          )
        }
        junto={junto ? <LineaBanda className="h-8 w-28 rounded-full" /> : undefined}
        bajada={
          bajada ?? (bajadaVariable ? <LineaBanda style={{ width: `${anchoBajada}em` }} /> : undefined)
        }
        acciones={
          acciones || botones ? (
            <>
              {acciones}
              {botones}
            </>
          ) : undefined
        }
      />
    </>
  );
}

/**
 * Respaldo de los loading.tsx de una carpeta con pantallas adentro. Next
 * precarga cada ruta hasta el primer loading.tsx del camino, así que este
 * puede verse un instante antes que el de la pantalla: por eso lleva solo lo
 * que todas comparten, el "Volver" arriba, y el específico solo agrega
 * contenido debajo. Sin banda: no todas las pantallas de adentro la tienen.
 * `como="main"` en las públicas de /ofertas, igual que su página.
 */
export function EsqueletoRespaldo({
  volver,
  como = "div",
}: {
  volver: string;
  como?: "div" | "main";
}) {
  return (
    <ContenedorEsqueleto
      como={como}
      className={cn("flex flex-col", como === "main" && "flex-1")}
    >
      <BotonVolver href={volver} destacado />
    </ContenedorEsqueleto>
  );
}

// ── 2. Pastillas y buscador ─────────────────────────────────────────────────

/**
 * Fila de pastillas de filtro con su texto real y la cantidad en gris. Se
 * marca activa la primera (el filtro por defecto). Misma fila que
 * GrupoPastillas: en el celular, una fila con scroll; desde sm, bajan.
 */
export function PastillasEsqueleto({
  etiquetas,
  titulo,
  activa = 0,
  conCantidad = true,
  /** Pastillas sin cantidad después de una línea (Eliminadas, en Mis ofertas). */
  despuesDeLinea,
  claseUna,
  className,
}: {
  etiquetas: readonly string[];
  /** Rótulo de arriba ("Estado"), como GrupoPastillas. */
  titulo?: string;
  activa?: number | null;
  conCantidad?: boolean;
  despuesDeLinea?: readonly string[];
  /** Clases extra de cada pastilla (por ejemplo "sm:h-11"). */
  claseUna?: string;
  className?: string;
}) {
  const fila = (
    <div
      aria-hidden="true"
      className="sin-barra-scroll -mx-4 -my-1 flex gap-2 overflow-x-auto px-4 py-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
    >
      {etiquetas.map((e, i) => {
        const esActiva = i === activa;
        return (
          <span key={e} className={clasePastilla(esActiva, cn("pointer-events-none", claseUna))}>
            {e}
            {conCantidad && (
              <span
                className={cn(
                  PULSO,
                  "-mr-2 ml-2 inline-block h-7 w-7 rounded-full",
                  esActiva ? "bg-primary-foreground/35" : "bg-secondary-hover",
                )}
              />
            )}
          </span>
        );
      })}
      {despuesDeLinea && (
        <>
          <span className="w-px shrink-0 self-stretch bg-separador-filtro" />
          {despuesDeLinea.map((e) => (
            <span key={e} className={clasePastilla(false, cn("pointer-events-none", claseUna))}>
              {e}
            </span>
          ))}
        </>
      )}
    </div>
  );

  if (!titulo) return <div className={cn("min-w-0", className)}>{fila}</div>;
  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)}>
      <span aria-hidden="true" className="text-[13px] font-bold text-muted-foreground-strong">
        {titulo}
      </span>
      {fila}
    </div>
  );
}

/** El Buscador sin texto: el campo de 48 px con la lupa y el placeholder real. */
export function BuscadorEsqueleto({
  placeholder,
  etiqueta,
  className,
  inputClassName,
}: {
  placeholder: string;
  /** Rótulo visible arriba del campo (etiquetaVisible). */
  etiqueta?: string;
  className?: string;
  inputClassName?: string;
}) {
  const campo = (
    <div className="relative min-w-0 flex-1">
      <Search
        className="pointer-events-none absolute top-1/2 left-3.5 h-[18px] w-[18px] -translate-y-1/2 text-muted-icon"
        aria-hidden="true"
      />
      <div className={cn("campo flex items-center truncate pl-10 text-placeholder", inputClassName)}>
        <span className="truncate">{placeholder}</span>
      </div>
    </div>
  );
  return (
    <div aria-hidden="true" className={cn(etiqueta ? "flex flex-col gap-1.5" : "relative", className)}>
      {etiqueta && <span className="etiqueta-campo">{etiqueta}</span>}
      {campo}
    </div>
  );
}

/** Un filtro desplegable (Combobox) con su rótulo real y el campo de 48 px. */
export function CampoFiltroEsqueleto({ etiqueta, className }: { etiqueta: string; className?: string }) {
  return (
    <div aria-hidden="true" className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <span className="etiqueta-campo">{etiqueta}</span>
      <div className="campo flex items-center">
        <Esqueleto className="h-4 w-2/3" />
      </div>
    </div>
  );
}

// ── 3. Tabla ────────────────────────────────────────────────────────────────

/** Qué va en cada celda: la persona (círculo y dos líneas), un título, texto, badge o botón. */
export type CeldaEsqueleto = "persona" | "titulo" | "texto" | "corto" | "badge" | "chips" | "boton";

function BloqueCelda({ tipo }: { tipo: CeldaEsqueleto }) {
  switch (tipo) {
    case "persona":
      return (
        <div className="flex min-w-0 items-center gap-3">
          <Esqueleto className="size-10 shrink-0 rounded-full" />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Esqueleto className="h-4 w-3/4" />
            <Esqueleto className="h-3 w-1/2" />
          </div>
        </div>
      );
    case "titulo":
      return (
        <div className="flex min-w-0 flex-col gap-1.5">
          <Esqueleto className="h-4 w-4/5" />
          <Esqueleto className="h-3 w-1/2" />
        </div>
      );
    case "texto":
      return <Esqueleto className="h-4 w-3/4" />;
    case "corto":
      return <Esqueleto className="h-4 w-20" />;
    case "badge":
      return <Esqueleto className="h-7 w-24 rounded-full" />;
    case "chips":
      return (
        <div className="flex gap-1.5">
          <Esqueleto className="h-7 w-20 rounded-full" />
          <Esqueleto className="h-7 w-14 rounded-full" />
        </div>
      );
    case "boton":
      return <Esqueleto className="h-11 w-full rounded-[var(--radius-md)] @4xl:h-10 @4xl:w-28" />;
  }
}

/**
 * La Tabla mientras carga: el encabezado gris real con los nombres de las
 * columnas (desde 896 px de ancho disponible) y filas con bloques por celda;
 * más angosto, una tarjeta por fila. Mismas clases que Tabla y FilaTabla.
 */
export function TablaEsqueleto({
  columnas,
  encabezados,
  celdas,
  filas = 5,
  filete = true,
  semantica = "lista",
  className,
}: {
  /** Las mismas columnas de la Tabla real. */
  columnas: string;
  encabezados: readonly string[];
  /** Un tipo por columna. */
  celdas: readonly CeldaEsqueleto[];
  filas?: number;
  /** Filete gris de 5 px a la izquierda, como las filas con estado. */
  filete?: boolean;
  /** La de la Tabla real: con "tabla", el encabezado va en 800 y alineado con el filete. */
  semantica?: "lista" | "tabla";
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn("@container", className)}
      style={{ "--columnas-tabla": columnas } as CSSProperties}
    >
      <div className="@4xl:grid @4xl:grid-cols-(--columnas-tabla) @4xl:gap-x-4 @4xl:overflow-hidden @4xl:rounded-[var(--radius-xl)] @4xl:border @4xl:border-border @4xl:bg-surface @4xl:shadow-[var(--sombra-tarjeta)]">
        <div
          className={cn(
            "hidden bg-tabla-cabecera py-3 text-xs tracking-[0.06em] text-neutral uppercase @4xl:col-span-full @4xl:grid @4xl:grid-cols-subgrid @4xl:gap-x-4",
            semantica === "tabla" ? "pr-4 pl-[21px] font-extrabold" : "px-4 font-bold",
          )}
        >
          {encabezados.map((e, i) => (
            <span key={i}>{e}</span>
          ))}
        </div>
        <div className="flex flex-col gap-3 @4xl:col-span-full @4xl:grid @4xl:grid-cols-subgrid @4xl:gap-x-4 @4xl:gap-y-0">
          {Array.from({ length: filas }, (_, f) => (
            <div
              key={f}
              className={cn(
                "flex flex-col gap-3 rounded-[var(--radius-xl)] border border-border bg-surface p-4 shadow-[var(--sombra-tarjeta)]",
                "@4xl:col-span-full @4xl:grid @4xl:min-h-[69px] @4xl:grid-cols-subgrid @4xl:items-center @4xl:gap-x-4 @4xl:rounded-none @4xl:border-x-0 @4xl:border-t-0 @4xl:border-b-tabla-borde @4xl:px-4 @4xl:py-3.5 @4xl:shadow-none @4xl:last:border-b-0",
                filete &&
                  "relative overflow-hidden pl-[21px] before:absolute before:inset-y-0 before:left-0 before:w-[5px] before:bg-secondary-hover @4xl:pl-[21px]",
              )}
            >
              {celdas.map((c, i) => (
                <div key={i} className="min-w-0">
                  <BloqueCelda tipo={c} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── 4. Cuadros por estado ───────────────────────────────────────────────────

/**
 * Los cuadros de estado (CuadroEstado) en su grilla de cinco. Con `etiquetas`
 * (fijas), el nombre de cada cuadro va real; el ícono y el número, en gris.
 * Con `pie`, el chip de la acción (pendientes de la oficina).
 */
export function CuadrosEsqueleto({
  cantidad = 5,
  etiquetas,
  pie = false,
  className,
}: {
  cantidad?: number;
  etiquetas?: readonly string[];
  pie?: boolean;
  className?: string;
}) {
  const total = etiquetas?.length ?? cantidad;
  return (
    <div aria-hidden="true" className={cn("@container", className)}>
      <div className={CLASE_GRILLA_CUADROS}>
        {Array.from({ length: total }, (_, i) => (
          <div key={i} className={claseCeldaCuadro(i)}>
            <div className={cn(CLASE_CUADRO_ESTADO, "before:bg-secondary-hover")}>
              <Esqueleto className="size-10 rounded-[11px]" />
              <Esqueleto className="h-[38px] w-14" />
              {etiquetas ? (
                <span className="text-sm leading-tight font-bold break-words hyphens-auto text-heading">
                  {etiquetas[i]}
                </span>
              ) : (
                <Esqueleto className="h-[17.5px] w-24 max-w-full" />
              )}
              {pie && (
                <span className="mt-auto pt-1">
                  <Esqueleto className="h-7 w-32 max-w-full rounded-[14px]" />
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Tarjetas sueltas ────────────────────────────────────────────────────────

/** Título de bloque (TituloBloque): el cuadrado de 40 px y el título real o una línea. */
export function TituloBloqueEsqueleto({
  titulo,
  bajada,
  bajadaVariable = false,
}: {
  titulo?: string;
  bajada?: string;
  bajadaVariable?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Esqueleto className="size-10 shrink-0 rounded-[11px]" />
      <div className="min-w-0 flex-1">
        {titulo ? (
          <p className="text-xl leading-tight font-extrabold text-heading">{titulo}</p>
        ) : (
          <Esqueleto className="h-6 w-48 max-w-full" />
        )}
        {bajada && <p className="mt-0.5 text-[15px] text-muted-foreground">{bajada}</p>}
        {bajadaVariable && <Esqueleto className="mt-1 mb-1 h-[17px] w-48 max-w-full" />}
      </div>
    </div>
  );
}

/**
 * Una tarjeta del detalle o del perfil: título real (o una línea) y renglones
 * en gris. `crece` la estira para que las dos columnas terminen parejas.
 */
export function TarjetaEsqueleto({
  titulo,
  icono = true,
  lineas = 4,
  panel = true,
  className,
  children,
}: {
  titulo?: string;
  /** Con el cuadrado del ícono a la izquierda del título (TituloBloque). */
  icono?: boolean;
  lineas?: number;
  /** tarjeta-panel (18 × 16 / 22 × 24); si no, p-5 sm:p-6. */
  panel?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={cn("tarjeta min-w-0", panel ? "tarjeta-panel" : "p-5 sm:p-6", className)}>
      {icono ? (
        <TituloBloqueEsqueleto titulo={titulo} />
      ) : titulo ? (
        <p className="text-xl font-extrabold text-heading">{titulo}</p>
      ) : (
        <Esqueleto className="h-6 w-40" />
      )}
      <div aria-hidden="true" className={cn("flex flex-col gap-3", icono ? "mt-5" : "mt-4")}>
        {children ??
          Array.from({ length: lineas }, (_, i) => (
            <Esqueleto key={i} className={cn("h-4", i % 3 === 2 ? "w-1/2" : i % 2 ? "w-4/5" : "w-full")} />
          ))}
      </div>
    </div>
  );
}

/** Datos con ícono (MosaicosDatos, Datos de la oferta): cuadrado de 40 px, rótulo y valor. */
export function DatosEsqueleto({ cantidad = 4, className }: { cantidad?: number; className?: string }) {
  return (
    <div aria-hidden="true" className={cn("flex flex-col gap-4", className)}>
      {Array.from({ length: cantidad }, (_, i) => (
        <div key={i} className="flex items-start gap-3">
          <Esqueleto className="size-10 shrink-0 rounded-[11px]" />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5 pt-0.5">
            <Esqueleto className="h-3 w-20" />
            <Esqueleto className="h-4 w-3/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Textos de una oferta (SeccionTexto: Descripción, Requisitos…) separados por
 * una línea: el primer título va real; los que dependen de la oferta, en gris.
 */
export function TextosOfertaEsqueleto({
  titulo = "Descripción",
  secciones = 2,
  className,
}: {
  titulo?: string;
  secciones?: number;
  className?: string;
}) {
  return (
    <div className={cn("tarjeta tarjeta-panel flex min-w-0 flex-col divide-y divide-tabla-borde", className)}>
      {Array.from({ length: secciones }, (_, i) => (
        <div key={i} className="flex min-w-0 flex-col gap-2.5 py-5 first:pt-0 last:pb-0">
          <div className="flex items-center gap-2">
            <Esqueleto className="size-5 shrink-0 rounded" />
            {i === 0 ? (
              <p className="text-lg font-extrabold text-heading">{titulo}</p>
            ) : (
              <Esqueleto className="h-5 w-28" />
            )}
          </div>
          <div aria-hidden="true" className="flex flex-col gap-2">
            <Esqueleto className="h-4 w-full" />
            <Esqueleto className="h-4 w-11/12" />
            <Esqueleto className="h-4 w-3/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── 5. Tarjeta de oferta ────────────────────────────────────────────────────

/**
 * TarjetaOferta mientras carga. "detallada": ícono, título y empresa a la
 * izquierda; etiquetas a la derecha; dos renglones; el botón y el lugar.
 * "compacta": etiquetas arriba, título, empresa y el botón abajo.
 */
export function TarjetaOfertaEsqueleto({
  variante = "detallada",
  className,
}: {
  variante?: "compacta" | "detallada";
  className?: string;
}) {
  if (variante === "compacta") {
    return (
      <div aria-hidden="true" className={cn("tarjeta relative flex h-full flex-col gap-3.5 p-6", className)}>
        <Esqueleto className="absolute top-4 right-4 size-11 rounded-xl" />
        <div className="flex gap-2 pr-12">
          <Esqueleto className="h-7 w-24 rounded-full" />
          <Esqueleto className="h-7 w-20 rounded-full" />
        </div>
        <div className="flex flex-col gap-2">
          <Esqueleto className="h-6 w-3/4" />
          <Esqueleto className="h-4 w-1/2" />
        </div>
        <Esqueleto className="h-4 w-40" />
        <div className="mt-auto pt-1.5">
          <Esqueleto className="h-11 w-32 rounded-[var(--radius-md)]" />
        </div>
      </div>
    );
  }
  return (
    <div aria-hidden="true" className={cn("tarjeta @container flex flex-col gap-3.5 p-6", className)}>
      <div className="flex flex-col gap-3.5 @md:flex-row @md:items-start @md:justify-between @md:gap-4">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <Esqueleto className="size-11 shrink-0 rounded-xl" />
          <div className="flex min-w-0 flex-1 flex-col gap-2 pt-0.5">
            <Esqueleto className="h-6 w-3/4" />
            <Esqueleto className="h-4 w-1/2" />
          </div>
        </div>
        <div className="flex gap-2 @md:flex-col @md:items-end">
          <Esqueleto className="h-7 w-24 rounded-full" />
          <Esqueleto className="h-7 w-28 rounded-full" />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Esqueleto className="h-4 w-full" />
        <Esqueleto className="h-4 w-4/5" />
      </div>
      <div className="mt-auto flex flex-col gap-3 pt-1.5 @md:flex-row-reverse @md:items-center @md:justify-between">
        <Esqueleto className="h-4 w-40" />
        <Esqueleto className="h-11 w-32 rounded-[var(--radius-md)]" />
      </div>
    </div>
  );
}

/** Grilla de tarjetas de oferta detalladas (dos columnas desde @xl, como /ofertas). */
export function GrillaOfertasEsqueleto({ cantidad = 4 }: { cantidad?: number }) {
  return (
    <div className="@container">
      <div className="grid grid-cols-1 gap-4 @xl:grid-cols-2">
        {Array.from({ length: cantidad }, (_, i) => (
          <TarjetaOfertaEsqueleto key={i} />
        ))}
      </div>
    </div>
  );
}

// ── 6. Detalle con lateral ──────────────────────────────────────────────────

/**
 * DetalleConLateral con tarjetas en gris: usa el mismo componente, así las
 * dos columnas miden lo mismo y terminan a la misma altura (la última tarjeta
 * de cada columna crece).
 */
export function DetalleEsqueleto({
  principal,
  lateral,
  debajo,
  ...props
}: Omit<ComponentProps<typeof DetalleConLateral>, "principal" | "lateral"> & {
  principal?: ReactNode;
  lateral?: ReactNode;
}) {
  return (
    <DetalleConLateral
      {...props}
      principal={
        principal ?? (
          <>
            <TarjetaEsqueleto lineas={5} />
            <TarjetaEsqueleto lineas={4} />
          </>
        )
      }
      lateral={lateral ?? <TarjetaEsqueleto lineas={4} />}
      debajo={debajo}
    />
  );
}

// ── 7. Formulario ───────────────────────────────────────────────────────────

/** Un campo: el rótulo real (o una línea) y el campo vacío de 48 px. */
export function CampoEsqueleto({
  etiqueta,
  alto,
  className,
}: {
  etiqueta?: string;
  /** Alto del campo si no es 48 px (un textarea). */
  alto?: string;
  className?: string;
}) {
  return (
    <div aria-hidden="true" className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      {etiqueta ? (
        <span className="etiqueta-campo">{etiqueta}</span>
      ) : (
        <Esqueleto className="my-[3px] h-4 w-32" />
      )}
      <div className={cn("campo", alto ?? "h-12")} />
    </div>
  );
}

/**
 * Tarjeta de formulario: el número y el título reales (SeccionNumerada) o una
 * línea, y campos de 48 px con su rótulo. `columnas={2}` reparte los campos
 * desde sm, como GrillaLectura y los formularios del perfil.
 */
export function FormularioEsqueleto({
  numero,
  titulo,
  descripcion,
  etiquetas,
  campos = 4,
  columnas = 1,
  className,
}: {
  numero?: number;
  titulo?: string;
  descripcion?: string;
  /** Rótulos reales de los campos; si no, `campos` líneas. */
  etiquetas?: readonly string[];
  campos?: number;
  columnas?: 1 | 2;
  className?: string;
}) {
  const lista = etiquetas ?? Array.from({ length: campos }, () => undefined);
  return (
    <div className={cn("tarjeta px-4 py-5 sm:p-6", className)}>
      <div className="flex items-center gap-3">
        {numero !== undefined ? (
          <span
            aria-hidden="true"
            className="flex size-[34px] shrink-0 items-center justify-center rounded-full bg-primary text-[15px] font-extrabold text-primary-foreground"
          >
            {numero}
          </span>
        ) : (
          <Esqueleto className="size-10 shrink-0 rounded-[11px]" />
        )}
        {titulo ? (
          <p className="text-[19px] leading-snug font-extrabold text-heading">{titulo}</p>
        ) : (
          <Esqueleto className="h-6 w-48" />
        )}
      </div>
      {descripcion && (
        <p className="mt-1.5 text-sm text-muted-foreground sm:pl-[46px]">{descripcion}</p>
      )}
      <div className={cn("mt-5 grid grid-cols-1 gap-5", columnas === 2 && "sm:grid-cols-2 sm:gap-x-6")}>
        {lista.map((e, i) => (
          <CampoEsqueleto key={i} etiqueta={e} />
        ))}
      </div>
    </div>
  );
}

// ── 8. Notificaciones ───────────────────────────────────────────────────────

/** Lista agrupada por fecha: el título del grupo y tarjetas con el ícono de 40 px. */
export function NotificacionesEsqueleto({
  grupos = 2,
  porGrupo = 3,
  className,
}: {
  grupos?: number;
  porGrupo?: number;
  className?: string;
}) {
  return (
    <div aria-hidden="true" className={cn("flex flex-col gap-6", className)}>
      {Array.from({ length: grupos }, (_, g) => (
        <div key={g} className="flex flex-col gap-3">
          <p className="text-[13px]">
            <EsqueletoEnLinea className="w-28" />
          </p>
          <div className="flex flex-col gap-3">
            {Array.from({ length: porGrupo }, (_, i) => (
              <div key={i} className="tarjeta tarjeta-panel flex gap-3 sm:items-start sm:gap-4">
                <Esqueleto className="size-10 shrink-0 rounded-[11px]" />
                <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  {/* Renglones con el tamaño de letra real: título, mensaje y hora. */}
                  <div className="min-w-0 flex-1">
                    <p className="text-base leading-snug">
                      <EsqueletoEnLinea className="w-2/3" />
                    </p>
                    <p className="mt-1 text-[15px] leading-normal">
                      <EsqueletoEnLinea className="w-full" />
                    </p>
                    <p className="mt-1 text-[13px]">
                      <EsqueletoEnLinea className="w-24" />
                    </p>
                  </div>
                  {/* El link ("Ver detalle ›"): su texto depende del tipo; mide 44 px. */}
                  <div className="flex min-h-11 shrink-0 items-center">
                    <Esqueleto className="h-4 w-24" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── 9. Indicadores ──────────────────────────────────────────────────────────

/** Tarjetas de número (TarjetaNumero): mismo cuadro que CuadroEstado. */
export function NumerosEsqueleto({
  cantidad = 4,
  className = "grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4",
}: {
  cantidad?: number;
  /** La grilla de la pantalla. */
  className?: string;
}) {
  return (
    <div aria-hidden="true" className={className}>
      {Array.from({ length: cantidad }, (_, i) => (
        <div key={i} className={cn(CLASE_CUADRO_ESTADO, "before:bg-secondary-hover")}>
          <Esqueleto className="size-10 rounded-[11px]" />
          <Esqueleto className="mt-1 h-[30px] w-16 sm:h-[38px]" />
          <Esqueleto className="h-4 w-28 max-w-full" />
          <Esqueleto className="h-3 w-3/4" />
        </div>
      ))}
    </div>
  );
}

/**
 * Tarjeta de gráfico (TarjetaGrafico): título y descripción en gris y el
 * gráfico: una dona (anillo gris), barras o un área.
 */
export function GraficoEsqueleto({
  tipo,
  alto = "h-[380px]",
  className,
}: {
  tipo: "dona" | "barras" | "area";
  /** Alto total de la tarjeta, el del gráfico real. */
  alto?: string;
  className?: string;
}) {
  return (
    <div aria-hidden="true" className={cn("tarjeta flex min-w-0 flex-col px-4 py-[18px] sm:p-6", alto, className)}>
      <Esqueleto className="h-6 w-40" />
      <Esqueleto className="mt-2 h-4 w-2/3" />
      <div className="mt-5 flex min-h-0 flex-1 items-center justify-center">
        {tipo === "dona" && (
          <div className="flex w-full flex-col items-center gap-5 sm:flex-row sm:justify-center sm:gap-8">
            <div className={cn(PULSO, "size-40 shrink-0 rounded-full border-[22px] border-secondary-hover")} />
            <div className="flex w-full max-w-48 flex-col gap-3">
              {Array.from({ length: 4 }, (_, i) => (
                <Esqueleto key={i} className="h-4 w-full" />
              ))}
            </div>
          </div>
        )}
        {tipo === "barras" && (
          <div className="flex h-full max-h-56 w-full items-end gap-3 border-b border-tabla-borde">
            {[55, 80, 40, 95, 65, 30, 70].map((h, i) => (
              <Esqueleto key={i} className="flex-1 rounded-b-none" style={{ height: `${h}%` }} />
            ))}
          </div>
        )}
        {tipo === "area" && <Esqueleto className="h-full max-h-56 w-full rounded-[var(--radius-lg)]" />}
      </div>
    </div>
  );
}
