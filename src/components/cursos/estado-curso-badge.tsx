import {
  ESTADO_CURSO_LABEL,
  ESTADO_CURSO_STYLE,
  type EstadoAsignacionCurso,
} from "@/lib/cursos";
import { cn } from "@/lib/utils";

export function EstadoCursoBadge({
  estado,
  className,
}: {
  estado: EstadoAsignacionCurso;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium",
        ESTADO_CURSO_STYLE[estado] ?? "bg-gray-100 text-gray-600",
        className,
      )}
    >
      {ESTADO_CURSO_LABEL[estado] ?? estado}
    </span>
  );
}
