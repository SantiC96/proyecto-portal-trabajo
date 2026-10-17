import { cn } from "@/lib/utils";
import {
  SIN_COMPLETAR,
  etiquetaDisponibilidad,
  etiquetaNivelEducativo,
  etiquetaSituacionLaboral,
  type InformacionLaboral,
} from "@/lib/informacion-laboral";

/**
 * Información laboral del postulante, solo lectura. La usan la ficha de la
 * oficina y las fichas del candidato de la empresa. Los campos vacíos se
 * muestran siempre como "Sin completar".
 */
export function InformacionLaboralResumen({
  info,
  className,
}: {
  info: InformacionLaboral;
  className?: string;
}) {
  const experiencia = info.experiencia_laboral?.trim() || null;
  const campos = [
    { label: "Nivel educativo", valor: etiquetaNivelEducativo(info.nivel_educativo) },
    { label: "Situación laboral", valor: etiquetaSituacionLaboral(info.situacion_laboral) },
    { label: "Disponibilidad horaria", valor: etiquetaDisponibilidad(info.disponibilidad) },
  ];

  return (
    <div className={cn("rounded-[var(--radius-lg)] border border-border p-5", className)}>
      <h2 className="font-semibold text-foreground">Información laboral</h2>
      <dl className="mt-4 grid grid-cols-1 gap-y-3 text-sm sm:grid-cols-3 sm:gap-x-4">
        {campos.map((c) => (
          <div key={c.label}>
            <dt className="text-muted-foreground">{c.label}</dt>
            <dd className={cn("mt-0.5", c.valor ? "text-foreground" : "text-muted-foreground")}>
              {c.valor ?? SIN_COMPLETAR}
            </dd>
          </div>
        ))}
        <div className="sm:col-span-3">
          <dt className="text-muted-foreground">Experiencia laboral</dt>
          <dd
            className={cn(
              "mt-0.5 whitespace-pre-line break-words",
              experiencia ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {experiencia ?? SIN_COMPLETAR}
          </dd>
        </div>
      </dl>
    </div>
  );
}
