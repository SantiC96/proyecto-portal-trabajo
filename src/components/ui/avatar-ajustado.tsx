import { UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { FotoPrivada } from "@/components/ui/foto-privada";

const sizeMap = {
  sm: { wrapper: "h-8 w-8",   icon: "h-4 w-4",   texto: "text-xs",  px: 32 },
  nav: { wrapper: "h-[38px] w-[38px]", icon: "h-5 w-5", texto: "text-sm", px: 38 },
  lista: { wrapper: "h-10 w-10", icon: "h-5 w-5", texto: "text-sm", px: 40 },
  md: { wrapper: "h-14 w-14", icon: "h-7 w-7",   texto: "text-lg",  px: 56 },
  ficha: { wrapper: "h-[72px] w-[72px]", icon: "h-9 w-9", texto: "text-2xl", px: 72 },
  // Banda verde del detalle de la oficina: 56 px en el celular y 72 px desde sm.
  banda: { wrapper: "h-14 w-14 sm:h-[72px] sm:w-[72px]", icon: "h-7 w-7 sm:h-9 sm:w-9", texto: "text-lg sm:text-2xl", px: 72 },
  lg: { wrapper: "h-24 w-24", icon: "h-12 w-12", texto: "text-3xl", px: 96 },
  // Candidatos guardados: 52 px y 64 px cuando la tarjeta (un @container) es ancha.
  tarjeta: { wrapper: "h-[52px] w-[52px] @2xl:h-16 @2xl:w-16", icon: "h-7 w-7", texto: "text-lg", px: 64 },
};

const DEFAULT_AJUSTE = { x: 50, y: 50, zoom: 1 };

interface AvatarAjustadoProps {
  src?: string | null;
  alt?: string;
  ajuste?: { x: number; y: number; zoom: number };
  size?: keyof typeof sizeMap;
  className?: string;
  /** Sin foto (o si no carga) se muestran estas iniciales en lugar del ícono. */
  iniciales?: string;
  /** Círculo blanco con las iniciales en verde (sobre la banda verde). */
  claro?: boolean;
}

export function AvatarAjustado({
  src,
  alt = "Foto de perfil",
  ajuste,
  size = "md",
  className,
  iniciales,
  claro = false,
}: AvatarAjustadoProps) {
  const fondo = claro ? "bg-surface text-primary" : "bg-primary text-primary-foreground";
  const { wrapper, icon, texto, px } = sizeMap[size];
  const relleno = iniciales ? (
    <span aria-hidden="true" className={cn("leading-none", claro ? "font-extrabold" : "font-semibold", texto)}>
      {iniciales}
    </span>
  ) : (
    <UserRound className={icon} />
  );
  // alt="" = decorativa (por ejemplo, en el menú, junto al nombre).
  const etiqueta = alt
    ? { role: "img" as const, "aria-label": alt }
    : { "aria-hidden": true as const };
  const { x, y, zoom } = ajuste ?? DEFAULT_AJUSTE;

  if (src) {
    return (
      <div
        className={cn("shrink-0 rounded-full overflow-hidden", claro && "bg-surface", wrapper, className)}
      >
        <FotoPrivada
          src={src}
          alt={alt}
          width={px}
          height={px}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: `${x}% ${y}%`,
            transform: `scale(${zoom})`,
            transformOrigin: `${x}% ${y}%`,
          }}
          fallback={
            <div
              {...etiqueta}
              className={cn("flex h-full w-full items-center justify-center", fondo)}
            >
              {relleno}
            </div>
          }
        />
      </div>
    );
  }

  return (
    <div
      {...etiqueta}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full",
        fondo,
        wrapper,
        className
      )}
    >
      {relleno}
    </div>
  );
}
