"use client";

import { useState, type ReactNode } from "react";
import { CalendarDays, ChevronDown } from "lucide-react";
import { es } from "react-day-picker/locale";
import { Calendar } from "@/components/ui/calendar";
import { Combobox } from "@/components/ui/combobox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ErrorCampo, Obligatorio, ariaErrorCampo } from "@/components/ui/obligatorio";
import { cn } from "@/lib/utils";

const TZ = "America/Argentina/Buenos_Aires";

// Turnos de 15 minutos de 08:00 a 20:00, en hora de Argentina.
const HORAS = Array.from({ length: 13 }, (_, i) => String(i + 8).padStart(2, "0"));
const MINUTOS = ["00", "15", "30", "45"];
const ULTIMA_HORA = "20";

function ahoraEnArgentina(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: TZ }));
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

const FORMATO_PARTES_ARGENTINA = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/**
 * Lo contrario de fechaHoraISO: el día y la hora en Argentina de una fecha
 * guardada, para precargar el formulario al reprogramar. undefined si no es
 * válida o si ya pasó (hay que elegir una nueva).
 */
export function diaYHoraFuturos(iso: string | null | undefined): { dia: Date; hora: string } | undefined {
  if (!iso) return undefined;
  const fecha = new Date(iso);
  if (isNaN(fecha.getTime()) || fecha.getTime() <= Date.now()) return undefined;
  const lista = FORMATO_PARTES_ARGENTINA.formatToParts(fecha);
  const parte = (tipo: Intl.DateTimeFormatPartTypes) => lista.find((p) => p.type === tipo)?.value ?? "";
  return {
    dia: new Date(Number(parte("year")), Number(parte("month")) - 1, Number(parte("day"))),
    hora: `${parte("hour")}:${parte("minute")}`,
  };
}

const FORMATO_DIA_LARGO = new Intl.DateTimeFormat("es-AR", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

/** "Martes 3 de noviembre" de un día del calendario (fecha local, sin zona). */
function formatDiaLargo(dia: Date): string {
  const lista = FORMATO_DIA_LARGO.formatToParts(dia);
  const parte = (tipo: Intl.DateTimeFormatPartTypes) => lista.find((p) => p.type === tipo)?.value ?? "";
  const semana = parte("weekday");
  const anio = dia.getFullYear() !== ahoraEnArgentina().getFullYear() ? ` de ${dia.getFullYear()}` : "";
  return `${semana.charAt(0).toUpperCase()}${semana.slice(1)} ${parte("day")} de ${parte("month")}${anio}`;
}

type Props = {
  /** id del botón: el label apunta acá y el error se describe desde acá. */
  id: string;
  etiqueta?: ReactNode;
  dia: Date | undefined;
  hora: string;
  onDiaChange: (dia: Date | undefined) => void;
  onHoraChange: (hora: string) => void;
  deshabilitado?: boolean;
  error?: string;
  /** Deshabilita los días y horarios pasados. Por defecto, sí. */
  soloFuturo?: boolean;
};

/**
 * Fecha y hora en un solo campo: un botón con el estilo de los campos que
 * abre un calendario (semana desde el lunes, hoy marcado, el día elegido en
 * verde) y la hora en dos listas (horas de 08 a 20, minutos cada 15).
 * Teclado: Enter o Espacio abren; en el calendario las flechas recorren los
 * días, Enter elige; Tab llega a la hora y a "Listo"; Escape cierra y el foco
 * vuelve al botón. El valor no cambia de formato: día del calendario y
 * "HH:MM", que fechaHoraISO convierte a ISO en hora de Argentina.
 */
export function CampoFechaHora({
  id,
  etiqueta = "Fecha y hora",
  dia,
  hora,
  onDiaChange,
  onHoraChange,
  deshabilitado = false,
  error,
  soloFuturo = true,
}: Props) {
  const [abierto, setAbierto] = useState(false);
  const idPopup = `${id}-popup`;
  const idHora = `${id}-hora`;
  const idMinutos = `${id}-minutos`;

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const [hh, mm] = hora ? hora.split(":") : ["", ""];
  const pasado = (h: string, m: string) => soloFuturo && horarioYaPaso(dia, `${h}:${m}`);
  const minutosDe = (h: string) => (h === ULTIMA_HORA ? ["00"] : MINUTOS);
  const horaSinTurnos = (h: string) => minutosDe(h).every((m) => pasado(h, m));

  function elegirDia(nuevo: Date | undefined) {
    onDiaChange(nuevo);
    // Si el día nuevo es hoy y la hora elegida ya pasó, hay que elegir otra.
    if (nuevo && hora && soloFuturo && horarioYaPaso(nuevo, hora)) onHoraChange("");
  }

  function elegirHora(nuevaHora: string) {
    if (!nuevaHora) return onHoraChange("");
    const opciones = minutosDe(nuevaHora).filter((m) => !pasado(nuevaHora, m));
    const minutos = mm && opciones.includes(mm) ? mm : (opciones[0] ?? "00");
    onHoraChange(`${nuevaHora}:${minutos}`);
  }

  const texto = dia ? `${formatDiaLargo(dia)}${hora ? `, ${hora} h` : " · falta la hora"}` : null;

  return (
    <div>
      <label htmlFor={id} className="etiqueta-campo mb-1.5 block">
        {etiqueta} <Obligatorio />
      </label>
      <Popover open={abierto} onOpenChange={setAbierto}>
        <PopoverTrigger
          id={id}
          type="button"
          disabled={deshabilitado}
          {...ariaErrorCampo(id, error)}
          className={cn(
            "campo flex items-center gap-3 text-left disabled:cursor-not-allowed disabled:bg-surface-tinted",
            "data-[popup-open]:border-primary data-[popup-open]:shadow-[var(--sombra-foco-campo)]",
          )}
        >
          <CalendarDays aria-hidden="true" className="size-5 shrink-0 text-muted-icon" />
          <span className={cn("min-w-0 flex-1 truncate", !texto && "text-placeholder")}>
            {texto ?? "Elegí la fecha y la hora"}
          </span>
          <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-muted-icon" />
        </PopoverTrigger>
        <PopoverContent
          id={idPopup}
          align="start"
          aria-label="Elegir la fecha y la hora"
          // El foco entra en el día elegido (o en hoy), no en "mes anterior".
          initialFocus={() =>
            document
              .getElementById(idPopup)
              ?.querySelector<HTMLElement>('[data-slot="calendar"] button[tabindex="0"]') ?? true
          }
          className="w-auto max-w-[calc(100vw_-_2rem)] gap-4 rounded-[var(--radius-lg)] bg-surface p-3 shadow-[var(--sombra-dialogo)] ring-1 ring-border"
        >
          <Calendar
            mode="single"
            selected={dia}
            onSelect={elegirDia}
            disabled={soloFuturo ? { before: hoy } : undefined}
            startMonth={soloFuturo ? hoy : undefined}
            defaultMonth={dia ?? hoy}
            locale={es}
            weekStartsOn={1}
          />

          <fieldset className="flex min-w-0 flex-col gap-1.5 border-t border-border pt-3">
            <legend className="sr-only">Hora</legend>
            <div className="grid grid-cols-2 gap-3">
              <div className="min-w-0">
                <label htmlFor={idHora} className="etiqueta-campo mb-1.5 block">
                  Hora
                </label>
                {/* Sin buscador: son números de dos cifras y la lista entra entera. */}
                <Combobox
                  id={idHora}
                  buscador={false}
                  opcionVacia="--"
                  opciones={[...new Set([...HORAS, ...(hh ? [hh] : [])])].sort().map((h) => ({
                    id: h,
                    nombre: h,
                    deshabilitada: horaSinTurnos(h),
                  }))}
                  valor={hh}
                  onCambiar={elegirHora}
                  deshabilitado={!dia}
                  triggerClassName="campo cursor-pointer"
                />
              </div>
              <div className="min-w-0">
                <label htmlFor={idMinutos} className="etiqueta-campo mb-1.5 block">
                  Minutos
                </label>
                {/* Un horario guardado fuera de los turnos se conserva al precargar. */}
                <Combobox
                  id={idMinutos}
                  buscador={false}
                  placeholder="--"
                  opciones={[...new Set([...minutosDe(hh), ...(mm ? [mm] : [])])].sort().map((m) => ({
                    id: m,
                    nombre: m,
                    deshabilitada: pasado(hh, m),
                  }))}
                  valor={mm}
                  onCambiar={(m) => onHoraChange(`${hh}:${m}`)}
                  deshabilitado={!dia || !hh}
                  triggerClassName="campo cursor-pointer"
                />
              </div>
            </div>
            {!dia && <p className="text-[13px] text-muted-foreground">Elegí primero el día.</p>}
          </fieldset>

          <button type="button" onClick={() => setAbierto(false)} className="btn-primario min-h-11 w-full">
            Listo
          </button>
        </PopoverContent>
      </Popover>
      <ErrorCampo idCampo={id} mensaje={error} className="mt-1.5" />
    </div>
  );
}
