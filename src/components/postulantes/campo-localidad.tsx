"use client";

import { MapPin } from "lucide-react";
import {
  CLASE_CONTROL_INVALIDO,
  ErrorCampo,
  Obligatorio,
  ariaErrorCampo,
} from "@/components/ui/obligatorio";
import {
  LOCALIDADES,
  LOCALIDAD_LARGO_MAXIMO,
  OTRA_LOCALIDAD,
  normalizarLocalidad,
} from "@/lib/localidades";
import { cn } from "@/lib/utils";

const claseSelect =
  "min-h-11 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60 " +
  CLASE_CONTROL_INVALIDO;

const claseInput =
  "min-h-11 w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-placeholder outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60 " +
  CLASE_CONTROL_INVALIDO;

type Props = {
  /** Prefijo de los ids: `${id}` el desplegable y `${id}-otra` el campo de texto. */
  id: string;
  elegida: string;
  escrita: string;
  onElegida: (valor: string) => void;
  onEscrita: (valor: string) => void;
  errorLocalidad?: string;
  errorOtra?: string;
  deshabilitado?: boolean;
  className?: string;
};

/**
 * "¿De dónde sos?": desplegable con las localidades de la zona (Funes
 * primero) y "Otra localidad", que muestra un campo de texto obligatorio. Al
 * salir del campo, lo escrito se normaliza para que se vea como se va a
 * guardar ("villa constitución" → "Villa Constitución").
 */
export function CampoLocalidad({
  id,
  elegida,
  escrita,
  onElegida,
  onEscrita,
  errorLocalidad,
  errorOtra,
  deshabilitado = false,
  className,
}: Props) {
  const idOtra = `${id}-otra`;

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={id} className="text-sm font-medium text-foreground">
          ¿De dónde sos? <Obligatorio />
        </label>
        <select
          id={id}
          required
          value={elegida}
          disabled={deshabilitado}
          onChange={(e) => onElegida(e.target.value)}
          className={claseSelect}
          {...ariaErrorCampo(id, errorLocalidad)}
        >
          <option value="" disabled>
            Elegí tu localidad
          </option>
          {LOCALIDADES.map((localidad) => (
            <option key={localidad} value={localidad}>
              {localidad}
            </option>
          ))}
          <option value={OTRA_LOCALIDAD}>Otra localidad</option>
        </select>
        <ErrorCampo idCampo={id} mensaje={errorLocalidad} />
      </div>

      {elegida === OTRA_LOCALIDAD && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={idOtra} className="text-sm font-medium text-foreground">
            ¿Cuál? <Obligatorio />
          </label>
          <div className="relative">
            <MapPin
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-icon"
              aria-hidden="true"
            />
            <input
              id={idOtra}
              type="text"
              required
              autoComplete="address-level2"
              value={escrita}
              disabled={deshabilitado}
              maxLength={LOCALIDAD_LARGO_MAXIMO}
              onChange={(e) => onEscrita(e.target.value)}
              onBlur={(e) => onEscrita(normalizarLocalidad(e.target.value))}
              placeholder="Ej: Villa Constitución"
              className={claseInput}
              {...ariaErrorCampo(idOtra, errorOtra)}
            />
          </div>
          <ErrorCampo idCampo={idOtra} mensaje={errorOtra} />
        </div>
      )}
    </div>
  );
}
