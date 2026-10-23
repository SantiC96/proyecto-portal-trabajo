import { Building2 } from "lucide-react";
import { inicialesDeEmpresa } from "@/lib/iniciales";
import { cn } from "@/lib/utils";

/**
 * Círculo con las iniciales de la empresa de una oferta. El logo no se
 * muestra: está en el bucket privado de avatares y el postulante no lo puede
 * leer. Es decorativo: el nombre de la empresa siempre está al lado.
 */
export function InicialesEmpresa({
  empresa,
  tamano,
  className,
}: {
  empresa: string | null;
  tamano: 44 | 64;
  className?: string;
}) {
  const iniciales = empresa ? inicialesDeEmpresa(empresa) : undefined;
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-primary font-extrabold text-primary-foreground",
        tamano === 64 ? "size-16 text-[22px]" : "size-11 text-base",
        className,
      )}
    >
      {iniciales ?? <Building2 className={tamano === 64 ? "size-7" : "size-5"} />}
    </span>
  );
}
