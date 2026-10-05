import { UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

const sizeMap = {
  sm: { wrapper: "h-8 w-8",   icon: "h-4 w-4" },
  md: { wrapper: "h-14 w-14", icon: "h-7 w-7" },
  lg: { wrapper: "h-24 w-24", icon: "h-12 w-12" },
};

const DEFAULT_AJUSTE = { x: 50, y: 50, zoom: 1 };

interface AvatarAjustadoProps {
  src?: string | null;
  alt?: string;
  ajuste?: { x: number; y: number; zoom: number };
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function AvatarAjustado({
  src,
  alt = "Foto de perfil",
  ajuste,
  size = "md",
  className,
}: AvatarAjustadoProps) {
  const { wrapper, icon } = sizeMap[size];
  const { x, y, zoom } = ajuste ?? DEFAULT_AJUSTE;

  if (src) {
    return (
      <div
        className={cn("shrink-0 rounded-full overflow-hidden", wrapper, className)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: `${x}% ${y}%`,
            transform: `scale(${zoom})`,
            transformOrigin: `${x}% ${y}%`,
          }}
        />
      </div>
    );
  }

  return (
    <div
      aria-label={alt}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground",
        wrapper,
        className
      )}
    >
      <UserRound className={icon} />
    </div>
  );
}
