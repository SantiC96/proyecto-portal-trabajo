const TZ = "America/Argentina/Buenos_Aires";

function parseFecha(value: string | null | undefined): Date | null {
  if (value == null || value === "") return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return d;
}

export function formatFecha(iso: string | null | undefined): string {
  const d = parseFecha(iso);
  if (!d) return "—";
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: TZ,
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

export function formatFechaCorta(iso: string | null | undefined): string {
  const d = parseFecha(iso);
  if (!d) return "—";
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: TZ,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

/** "20 oct": día y mes corto, sin año. */
export function formatFechaDiaMes(iso: string | null | undefined): string {
  const d = parseFecha(iso);
  if (!d) return "—";
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: TZ,
    day: "numeric",
    month: "short",
  }).format(d);
}

// Las horas siempre en 24 horas ("16:15"), sin depender del idioma ni de la
// configuración del navegador: hourCycle "h23" y armado manual con las partes.
const FORMATO_FECHA_HORA = new Intl.DateTimeFormat("es-AR", {
  timeZone: TZ,
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const FORMATO_FECHA_HORA_CORTA = new Intl.DateTimeFormat("es-AR", {
  timeZone: TZ,
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function partes(formato: Intl.DateTimeFormat, d: Date) {
  const lista = formato.formatToParts(d);
  return (tipo: Intl.DateTimeFormatPartTypes) =>
    lista.find((p) => p.type === tipo)?.value ?? "";
}

/** "20 de octubre de 2026 a las 16:15". */
export function formatFechaHora(iso: string | null | undefined): string {
  const d = parseFecha(iso);
  if (!d) return "—";
  const parte = partes(FORMATO_FECHA_HORA, d);
  return `${parte("day")} de ${parte("month")} de ${parte("year")} a las ${parte("hour")}:${parte("minute")}`;
}

/** "20/10 16:15": fecha y hora compactas para listados y badges. */
export function formatFechaHoraCorta(iso: string | null | undefined): string {
  const d = parseFecha(iso);
  if (!d) return "—";
  const parte = partes(FORMATO_FECHA_HORA_CORTA, d);
  return `${parte("day")}/${parte("month")} ${parte("hour")}:${parte("minute")}`;
}

const UNIDADES_RELATIVAS: { unidad: Intl.RelativeTimeFormatUnit; segundos: number }[] = [
  { unidad: "week", segundos: 7 * 24 * 60 * 60 },
  { unidad: "day", segundos: 24 * 60 * 60 },
  { unidad: "hour", segundos: 60 * 60 },
  { unidad: "minute", segundos: 60 },
];

/**
 * "hace 2 horas", "ayer", "hace 3 semanas". Menos de un minuto: "recién";
 * más de 4 semanas: la fecha corta.
 */
export function formatFechaRelativa(
  iso: string | null | undefined,
  ahora: number = Date.now(),
): string {
  const d = parseFecha(iso);
  if (!d) return "—";
  const segundos = Math.round((d.getTime() - ahora) / 1000);
  const abs = Math.abs(segundos);
  if (abs < 60) return "recién";
  if (abs >= 5 * 7 * 24 * 60 * 60) return formatFechaCorta(iso);

  const rtf = new Intl.RelativeTimeFormat("es-AR", { numeric: "auto" });
  const { unidad, segundos: tamano } =
    UNIDADES_RELATIVAS.find((u) => abs >= u.segundos) ?? UNIDADES_RELATIVAS[3];
  return rtf.format(Math.trunc(segundos / tamano), unidad);
}

/** Momento de hace `dias` días, en ISO (para filtros relativos a ahora). */
export function haceDiasISO(dias: number): string {
  return new Date(Date.now() - dias * 24 * 60 * 60 * 1000).toISOString();
}

/** Momento dentro de `dias` días (0 = ahora), en ISO. */
export function dentroDeDiasISO(dias: number): string {
  return new Date(Date.now() + dias * 24 * 60 * 60 * 1000).toISOString();
}

/**
 * 1 de enero a las 00:00 del año en curso en Argentina, en ISO. Argentina
 * está en UTC-3 todo el año (sin horario de verano desde 2009).
 */
export function inicioAnioArgentinaISO(ahora: Date = new Date()): string {
  const anio = new Intl.DateTimeFormat("en-US", { timeZone: TZ, year: "numeric" }).format(ahora);
  return new Date(`${anio}-01-01T00:00:00-03:00`).toISOString();
}

// Los meses llegan como fecha sin hora ("2026-10-01"): se leen en UTC para que
// la zona horaria del servidor no los corra al mes anterior.
function fechaSinHora(valor: string): Date | null {
  const [anio, mes, dia] = valor.slice(0, 10).split("-").map(Number);
  if (!anio || !mes) return null;
  return new Date(Date.UTC(anio, mes - 1, dia || 1));
}

/** "oct": mes abreviado de una fecha sin hora. */
export function formatMesCorto(valor: string): string {
  const d = fechaSinHora(valor);
  if (!d) return "—";
  return new Intl.DateTimeFormat("es-AR", { timeZone: "UTC", month: "short" })
    .format(d)
    .replace(".", "");
}

/** "octubre de 2026": mes y año de una fecha sin hora. */
export function formatMesAnio(valor: string): string {
  const d = fechaSinHora(valor);
  if (!d) return "—";
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  }).format(d);
}


/** "12 oct": día y mes abreviado de una fecha sin hora. */
export function formatDiaMesCorto(valor: string): string {
  const d = fechaSinHora(valor);
  if (!d) return "—";
  return new Intl.DateTimeFormat("es-AR", { timeZone: "UTC", day: "numeric", month: "short" })
    .format(d)
    .replace(".", "");
}

const FORMATO_PARTES_DIA = new Intl.DateTimeFormat("es-AR", {
  timeZone: "UTC",
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

/** Las partes de una fecha sin hora, para armar textos como "del 6 al 12 de octubre". */
export function partesFechaSinHora(
  valor: string,
): { diaSemana: string; dia: string; mes: string; anio: string } | null {
  const d = fechaSinHora(valor);
  if (!d) return null;
  const parte = partes(FORMATO_PARTES_DIA, d);
  return { diaSemana: parte("weekday"), dia: parte("day"), mes: parte("month"), anio: parte("year") };
}
