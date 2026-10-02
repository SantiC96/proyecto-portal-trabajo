import { UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

const sizeMap = {
  sm: { wrapper: "h-8 w-8", icon: "h-4 w-4" },
  md: { wrapper: "h-14 w-14", icon: "h-7 w-7" },
  lg: { wrapper: "h-24 w-24", icon: "h-12 w-12" },
};

interface AvatarProps {
  src?: string | null;
  nombre?: string;
  apellido?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Avatar({ src, nombre = "", apellido = "", size = "md", className }: AvatarProps) {
  const { wrapper, icon } = sizeMap[size];

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={`Foto de ${nombre} ${apellido}`.trim() || "Foto de perfil"}
        className={cn("rounded-full object-cover", wrapper, className)}
      />
    );
  }

  return (
    <div
      aria-label={`Avatar de ${nombre} ${apellido}`.trim() || "Avatar"}
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
