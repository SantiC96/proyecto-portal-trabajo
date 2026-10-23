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
  /** Estilo de los campos de Mi perfil (alto 48, borde border-campo, label 15 px 700). */
  estiloPerfil?: boolean;
};

const ETIQUETA_PERFIL = "text-[15px] font-bold text-control-foreground";
const CAMPO_PERFIL = "campo min-h-12 rounded-[var(--radius-md)] border-border-campo text-base";
const ERROR_PERFIL = "text-[13px] font-semibold";

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
  estiloPerfil = false,
}: Props) {
  const idOtra = `${id}-otra`;

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={id}
          className={cn("text-sm font-medium text-foreground", estiloPerfil && ETIQUETA_PERFIL)}
        >
          ¿De dónde sos? <Obligatorio />
        </label>
        <select
          id={id}
          required
          value={elegida}
          disabled={deshabilitado}
          onChange={(e) => onElegida(e.target.value)}
          className={estiloPerfil ? CAMPO_PERFIL : claseSelect}
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
        <ErrorCampo
          idCampo={id}
          mensaje={errorLocalidad}
          className={estiloPerfil ? ERROR_PERFIL : undefined}
        />
      </div>

      {elegida === OTRA_LOCALIDAD && (
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor={idOtra}
            className={cn("text-sm font-medium text-foreground", estiloPerfil && ETIQUETA_PERFIL)}
          >
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
              className={estiloPerfil ? `${CAMPO_PERFIL} pl-10` : claseInput}
              {...ariaErrorCampo(idOtra, errorOtra)}
            />
          </div>
          <ErrorCampo
            idCampo={idOtra}
            mensaje={errorOtra}
            className={estiloPerfil ? ERROR_PERFIL : undefined}
          />
        </div>
      )}
    </div>
  );
}
