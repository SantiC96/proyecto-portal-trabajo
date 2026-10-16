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

export function formatFechaHora(iso: string | null | undefined): string {
  const d = parseFecha(iso);
  if (!d) return "—";
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: TZ,
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/** "20/10 10:30": fecha y hora compactas para listados y badges. */
export function formatFechaHoraCorta(iso: string | null | undefined): string {
  const d = parseFecha(iso);
  if (!d) return "—";
  const partes = new Intl.DateTimeFormat("es-AR", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const parte = (tipo: Intl.DateTimeFormatPartTypes) =>
    partes.find((p) => p.type === tipo)?.value ?? "";
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
