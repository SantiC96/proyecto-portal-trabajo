const TZ = "America/Argentina/Buenos_Aires";

export function formatFecha(iso: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: TZ,
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

export function formatFechaCorta(iso: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: TZ,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export function formatFechaHora(iso: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: TZ,
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}
