import { Badge } from "@/components/ui/badge";
import {
  ESTADO_CURSO_LABEL,
  ESTADO_CURSO_TONO,
  type EstadoAsignacionCurso,
} from "@/lib/cursos";

export function EstadoCursoBadge({
  estado,
  className,
}: {
  estado: EstadoAsignacionCurso;
  className?: string;
}) {
  return (
    <Badge tono={ESTADO_CURSO_TONO[estado] ?? "neutral"} estado className={className}>
      {ESTADO_CURSO_LABEL[estado] ?? estado}
    </Badge>
  );
}
