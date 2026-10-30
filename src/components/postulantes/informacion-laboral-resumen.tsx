import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  SIN_COMPLETAR,
  etiquetaDisponibilidad,
  etiquetaNivelEducativo,
  etiquetaSituacionLaboral,
  type InformacionLaboral,
} from "@/lib/informacion-laboral";

const ETIQUETA_OFICINA = "text-[13px] leading-[1.4] font-bold text-neutral";
const VALOR_OFICINA = "mt-1 text-base leading-[1.45]";

/**
 * Información laboral del postulante, solo lectura. La usan la ficha de la
 * oficina y las fichas del candidato de la empresa. Los campos vacíos se
 * muestran siempre como "Sin completar".
 */
export function InformacionLaboralResumen({
  info,
  encabezado,
  estiloOficina = false,
  className,
}: {
  info: InformacionLaboral;
  /** Reemplaza al título "Información laboral" (TituloBloque en la ficha de la oficina). */
  encabezado?: ReactNode;
  /** Datos con la etiqueta de 13 px 700 y el valor de 16 px, una columna por dato (ficha de la oficina). */
  estiloOficina?: boolean;
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
      {encabezado ?? <h2 className="font-semibold text-foreground">Información laboral</h2>}
      <dl
        className={cn(
          "grid grid-cols-1",
          estiloOficina ? "mt-5 gap-y-4" : "mt-4 gap-y-3 text-sm sm:grid-cols-3 sm:gap-x-4",
        )}
      >
        {campos.map((c) => (
          <div key={c.label}>
            <dt className={estiloOficina ? ETIQUETA_OFICINA : "text-muted-foreground"}>{c.label}</dt>
            <dd
              className={cn(
                estiloOficina ? VALOR_OFICINA : "mt-0.5",
                c.valor ? (estiloOficina ? "text-control-foreground" : "text-foreground") : "text-muted-foreground",
              )}
            >
              {c.valor ?? SIN_COMPLETAR}
            </dd>
          </div>
        ))}
        <div className={estiloOficina ? undefined : "sm:col-span-3"}>
          <dt className={estiloOficina ? ETIQUETA_OFICINA : "text-muted-foreground"}>Experiencia laboral</dt>
          <dd
            className={cn(
              estiloOficina ? VALOR_OFICINA : "mt-0.5",
              "whitespace-pre-line break-words",
              experiencia ? (estiloOficina ? "text-control-foreground" : "text-foreground") : "text-muted-foreground",
            )}
          >
            {experiencia ?? SIN_COMPLETAR}
          </dd>
        </div>
      </dl>
    </div>
  );
}
