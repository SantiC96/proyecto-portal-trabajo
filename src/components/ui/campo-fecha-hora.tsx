"use client";

import { es } from "react-day-picker/locale";
import { Calendar } from "@/components/ui/calendar";
import {
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
  /**
   * Fecha (campo de fecha del navegador) y horario lado a lado, para un
   * formulario dentro de una tarjeta angosta. Sin esto, el día se elige en un
   * calendario.
   */
  compacto?: boolean;
};

function aValorFecha(dia: Date): string {
  const mm = String(dia.getMonth() + 1).padStart(2, "0");
  const dd = String(dia.getDate()).padStart(2, "0");
  return `${dia.getFullYear()}-${mm}-${dd}`;
}

function deValorFecha(valor: string): Date | undefined {
  const [y, m, d] = valor.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}

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
  compacto = false,
}: Props) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const idDia = `${idHorario}-dia`;

  const selectHorario = (
    <select
      id={idHorario}
      value={hora}
      onChange={(e) => onHoraChange(e.target.value)}
      disabled={!dia || deshabilitado}
      {...ariaErrorCampo(idHorario, errorHora)}
      className="campo"
    >
      <option value="">{compacto ? "Elegí…" : "Elegí un horario…"}</option>
      {HORARIOS.map((slot) => (
        <option key={slot} value={slot} disabled={horarioYaPaso(dia, slot)}>
          {slot}
        </option>
      ))}
    </select>
  );

  if (compacto) {
    return (
      <div className="grid grid-cols-2 gap-3">
        <div className="min-w-0">
          <label htmlFor={idDia} className="etiqueta-campo mb-1.5 block">
            Fecha <Obligatorio />
          </label>
          <input
            id={idDia}
            type="date"
            min={aValorFecha(hoy)}
            value={dia ? aValorFecha(dia) : ""}
            onChange={(e) => {
              const nuevo = deValorFecha(e.target.value);
              onDiaChange(nuevo && nuevo >= hoy ? nuevo : undefined);
            }}
            disabled={deshabilitado}
            {...ariaErrorCampo(idDia, errorDia)}
            className="campo"
          />
          <ErrorCampo idCampo={idDia} mensaje={errorDia} className="mt-1.5" />
        </div>
        <div className="min-w-0">
          <label htmlFor={idHorario} className="etiqueta-campo mb-1.5 block">
            Hora <Obligatorio />
          </label>
          {selectHorario}
          <ErrorCampo idCampo={idHorario} mensaje={errorHora} className="mt-1.5" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div>
        <p id={`${idDia}-label`} className="etiqueta-campo mb-2">
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
            errorDia && "shadow-[var(--sombra-error-campo)]"
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
        <label htmlFor={idHorario} className="etiqueta-campo mb-1.5 block">
          Horario <Obligatorio />
        </label>
        {selectHorario}
        <ErrorCampo idCampo={idHorario} mensaje={errorHora} className="mt-1.5" />
      </div>
    </>
  );
}
