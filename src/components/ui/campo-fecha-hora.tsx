"use client";

import { es } from "react-day-picker/locale";
import { Calendar } from "@/components/ui/calendar";
import {
  CLASE_CONTROL_INVALIDO,
  ErrorCampo,
  Obligatorio,
  ariaErrorCampo,
} from "@/components/ui/obligatorio";
import { cn } from "@/lib/utils";

// Turnos de 15 minutos de 08:00 a 20:00, en hora de Argentina.
const HORARIOS: string[] = (() => {
  const slots: string[] = [];
  for (let h = 8; h <= 20; h++) {
    for (const m of [0, 15, 30, 45]) {
      if (h === 20 && m > 0) break;
      slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return slots;
})();

function ahoraEnArgentina(): Date {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Argentina/Buenos_Aires" })
  );
}

function esMismoDia(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** El turno ya pasó (solo puede pasar si el día elegido es hoy). */
export function horarioYaPaso(dia: Date | undefined, hora: string): boolean {
  if (!dia || !hora) return false;
  const ahora = ahoraEnArgentina();
  if (!esMismoDia(dia, ahora)) return false;
  const [h, m] = hora.split(":").map(Number);
  return h < ahora.getHours() || (h === ahora.getHours() && m <= ahora.getMinutes());
}

/** Día del calendario + "HH:MM" → ISO con el desplazamiento de Argentina (-03:00, sin horario de verano). */
export function fechaHoraISO(dia: Date, hora: string): string {
  const [h, m] = hora.split(":");
  const yyyy = dia.getFullYear();
  const mm = String(dia.getMonth() + 1).padStart(2, "0");
  const dd = String(dia.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${h}:${m}:00-03:00`;
}

type Props = {
  idHorario: string;
  dia: Date | undefined;
  hora: string;
  onDiaChange: (dia: Date | undefined) => void;
  onHoraChange: (hora: string) => void;
  deshabilitado?: boolean;
  /** Mensajes de error debajo del día y del horario. */
  errorDia?: string;
  errorHora?: string;
};

/** Día (calendario, desde hoy) y horario (select), ambos obligatorios. */
export function CampoFechaHora({
  idHorario,
  dia,
  hora,
  onDiaChange,
  onHoraChange,
  deshabilitado = false,
  errorDia,
  errorHora,
}: Props) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const idDia = `${idHorario}-dia`;

  return (
    <>
      <div>
        <p id={`${idDia}-label`} className="mb-2 text-sm font-medium text-foreground">
          Día <Obligatorio />
        </p>
        {/* El calendario no es un control de formulario: el grupo lleva el
            estado de error y recibe el foco cuando falta el día. */}
        <div
          id={idDia}
          role="group"
          aria-labelledby={`${idDia}-label`}
          tabIndex={-1}
          {...ariaErrorCampo(idDia, errorDia)}
          className={cn(
            "flex justify-center rounded-lg outline-none",
            errorDia && "ring-2 ring-red-500/20"
          )}
        >
          <Calendar
            mode="single"
            selected={dia}
            onSelect={onDiaChange}
            disabled={deshabilitado ? true : { before: hoy }}
            locale={es}
            captionLayout="label"
          />
        </div>
        <ErrorCampo idCampo={idDia} mensaje={errorDia} className="mt-1.5" />
      </div>

      <div>
        <label htmlFor={idHorario} className="mb-1.5 block text-sm font-medium text-foreground">
          Horario <Obligatorio />
        </label>
        <select
          id={idHorario}
          value={hora}
          onChange={(e) => onHoraChange(e.target.value)}
          disabled={!dia || deshabilitado}
          {...ariaErrorCampo(idHorario, errorHora)}
          className={cn(
            "h-11 w-full rounded-lg border border-border bg-white px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:bg-surface-tinted disabled:text-muted-foreground",
            CLASE_CONTROL_INVALIDO
          )}
        >
          <option value="">Elegí un horario…</option>
          {HORARIOS.map((slot) => (
            <option key={slot} value={slot} disabled={horarioYaPaso(dia, slot)}>
              {slot}
            </option>
          ))}
        </select>
        <ErrorCampo idCampo={idHorario} mensaje={errorHora} className="mt-1.5" />
      </div>
    </>
  );
}
