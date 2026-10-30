import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { CLASE_CUADRO_ESTADO } from "@/components/ui/cuadro-estado";
import { IconoCuadro } from "@/components/ui/icono-cuadro";

type Props = {
  icono: LucideIcon;
  /** Fondo del cuadrado del ícono (y el color del ícono si no va blanco). Por defecto, `primary`. */
  claseIcono?: string;
  /** Color del filete superior de 4 px: `before:bg-*`. Por defecto, `primary`. */
  claseFilete?: string;
  /** Número ya formateado ("1.234", "—"). */
  valor: string;
  etiqueta: string;
  subtitulo?: string;
  /** Pantalla con el listado correspondiente. */
  href?: string;
};

/**
 * Número destacado de un dashboard (indicadores de la empresa): filete
 * superior de 4 px, el ícono en un cuadrado de 40 px, el número (38 px 800;
 * 30 en el celular), la etiqueta (15 px 700) y una línea de contexto. Si
 * tiene `href`, toda la tarjeta es el link.
 */
export function TarjetaNumero({
  icono,
  claseIcono,
  claseFilete = "before:bg-primary",
  valor,
  etiqueta,
  subtitulo,
  href,
}: Props) {
  const contenido = (
    <>
      <IconoCuadro icono={icono} className={claseIcono} />
      <span className="mt-1 block text-[30px] leading-none font-extrabold tracking-[-0.01em] break-all text-heading tabular-nums sm:text-[38px]">
        {valor}
      </span>
      <span className="block text-[15px] leading-snug font-bold break-words hyphens-auto text-heading">
        {etiqueta}
      </span>
      {subtitulo && (
        <span className="-mt-1.5 block text-[13px] leading-snug text-muted-foreground">
          {subtitulo}
        </span>
      )}
    </>
  );

  const base = cn(CLASE_CUADRO_ESTADO, claseFilete);

  if (!href) return <div className={base}>{contenido}</div>;

  return (
    <Link
      href={href}
      className={cn(
        base,
        "tarjeta-clickeable pr-10 no-underline outline-none focus-visible:shadow-[var(--sombra-foco)]",
      )}
    >
      {contenido}
      <ChevronRight
        aria-hidden="true"
        className="absolute top-5 right-4 size-5 text-muted-icon"
      />
    </Link>
  );
}

/** Grilla de tarjetas de número: 4 columnas en escritorio, 2 en el celular. */
export function GrillaNumeros({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">{children}</div>;
}
