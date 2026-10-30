import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDecimal, type Variacion } from "./formato";

const ANCHO_LINEA = 120;
const ALTO_LINEA = 44;
/** Lugar para el trazo de 2 px arriba y abajo. */
const MARGEN_LINEA = 3;

/**
 * Mini línea de tendencia de 120 × 44: línea `primary` de 2 px y relleno al
 * 10 %. Decorativa (aria-hidden): el dato está en el número y la variación.
 * SVG del servidor, sin JavaScript.
 */
export function LineaTendencia({ valores, className }: { valores: number[]; className?: string }) {
  const lista = valores.length > 1 ? valores : [valores[0] ?? 0, valores[0] ?? 0];
  const maximo = Math.max(...lista);
  const alto = ALTO_LINEA - MARGEN_LINEA * 2;
  const puntos = lista.map((v, i) => {
    const x = (i / (lista.length - 1)) * ANCHO_LINEA;
    const y = MARGEN_LINEA + (maximo > 0 ? alto - (v / maximo) * alto : alto);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const linea = `M${puntos.join("L")}`;
  const area = `${linea}L${ANCHO_LINEA},${ALTO_LINEA}L0,${ALTO_LINEA}Z`;

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={ANCHO_LINEA}
      height={ALTO_LINEA}
      viewBox={`0 0 ${ANCHO_LINEA} ${ALTO_LINEA}`}
      preserveAspectRatio="none"
      className={cn("shrink-0 overflow-visible", className)}
    >
      <path d={area} fill="var(--color-primary)" fillOpacity={0.1} />
      <path
        d={linea}
        fill="none"
        stroke="var(--color-primary)"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

const SIGNO_MENOS = "−";

/** Texto de una variación: visible con flecha, y una frase completa para lectores de pantalla. */
function textosVariacion(v: Variacion): {
  destacado?: string;
  resto: string;
  lector: string;
  sentido: "sube" | "baja" | "igual";
} {
  switch (v.tipo) {
    case "inicio":
      return { resto: "Desde el inicio del portal", lector: "Desde el inicio del portal", sentido: "igual" };
    case "nuevo":
      return { resto: "Nuevo en este período", lector: "Nuevo en este período: el período anterior no tuvo", sentido: "igual" };
    case "sin-datos":
      return { resto: "Sin datos para comparar", lector: "Sin datos para comparar con el período anterior", sentido: "igual" };
    case "porcentaje":
    case "puntos": {
      if (v.valor === 0) {
        return {
          destacado: "Sin cambios",
          resto: " vs. período anterior",
          lector: "Sin cambios respecto del período anterior",
          sentido: "igual",
        };
      }
      const absoluto = formatDecimal(Math.abs(v.valor));
      const unidad = v.tipo === "puntos" ? " p. p." : " %";
      const unidadLector = v.tipo === "puntos" ? " puntos porcentuales" : " %";
      const sube = v.valor > 0;
      return {
        destacado: `${sube ? "↑ +" : `↓ ${SIGNO_MENOS}`}${absoluto}${unidad}`,
        resto: " vs. período anterior",
        lector: `${absoluto}${unidadLector} ${sube ? "más" : "menos"} que en el período anterior`,
        sentido: sube ? "sube" : "baja",
      };
    }
  }
}

/** "↑ +12 % vs. período anterior": la variación en 800, verde si sube y gris oscuro si baja. */
export function TextoVariacion({ variacion, className }: { variacion: Variacion; className?: string }) {
  const t = textosVariacion(variacion);
  return (
    <p className={cn("text-sm leading-snug text-muted-foreground", className)}>
      <span aria-hidden="true">
        {t.destacado && (
          <span
            className={cn(
              "font-extrabold tabular-nums",
              t.sentido === "sube" && "text-primary",
              t.sentido === "baja" && "text-muted-foreground-strong",
              t.sentido === "igual" && "text-control-foreground",
            )}
          >
            {t.destacado}
          </span>
        )}
        {t.resto}
      </span>
      <span className="sr-only">{t.lector}</span>
    </p>
  );
}

type Props = {
  icono: LucideIcon;
  etiqueta: string;
  /** Número ya formateado. */
  valor: string;
  /** Valores de la mini línea, del más viejo al más nuevo. */
  serie: number[];
  variacion: Variacion;
  /**
   * Sobre qué se calculó la variación, cuando no es el número de la tarjeta
   * ("24 nuevos en el período" bajo el total de postulantes).
   */
  nota?: string;
  /** Pantalla con el listado correspondiente: toda la tarjeta es el link. */
  href?: string;
};

/**
 * Tarjeta de la fila de arriba de los indicadores de la oficina: ícono y
 * nombre, el número con la mini línea de tendencia a la derecha y la
 * variación contra el período anterior.
 */
export function TarjetaTendencia({
  icono: Icono,
  etiqueta,
  valor,
  serie,
  variacion,
  nota,
  href,
}: Props) {
  const contenido = (
    <>
      <span className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="flex size-[46px] shrink-0 items-center justify-center rounded-[13px] bg-primary text-primary-foreground"
        >
          <Icono className="size-6" />
        </span>
        <span className="min-w-0 flex-1 text-base leading-snug font-bold text-heading">{etiqueta}</span>
        {href && <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-muted-icon" />}
      </span>
      <span className="mt-4 flex flex-wrap items-end justify-between gap-x-3 gap-y-2">
        <span className="text-[42px] leading-none font-extrabold tracking-[-0.01em] text-heading tabular-nums">
          {valor}
        </span>
        <LineaTendencia valores={serie} />
      </span>
      <TextoVariacion variacion={variacion} className="mt-3" />
      {nota && <span className="mt-0.5 block text-[13px] leading-snug text-muted-foreground">{nota}</span>}
    </>
  );

  const base = "tarjeta flex h-full flex-col rounded-[var(--radius-indicador)] p-5";
  if (!href) return <div className={base}>{contenido}</div>;
  return (
    <Link
      href={href}
      className={cn(
        base,
        "tarjeta-clickeable no-underline outline-none focus-visible:shadow-[var(--sombra-foco)]",
      )}
    >
      {contenido}
    </Link>
  );
}
