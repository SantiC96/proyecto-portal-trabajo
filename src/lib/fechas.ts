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
