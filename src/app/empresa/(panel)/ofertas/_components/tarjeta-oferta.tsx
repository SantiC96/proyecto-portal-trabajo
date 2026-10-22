import type { ReactNode } from "react";

/**
 * Disposición común de las tarjetas de Mis ofertas (activas y eliminadas):
 * arriba, título y datos a la izquierda y badges a la derecha; abajo,
 * textos informativos a la izquierda y botones a la derecha. En celular los
 * badges van arriba del título y los botones ocupan el ancho.
 *
 * `acciones` va ordenado de menor a mayor importancia: la principal al final,
 * así queda a la derecha del todo.
 */
export function TarjetaOferta({
  titulo,
  datos,
  badges,
  detalle,
  info,
  acciones,
}: {
  titulo: string;
  datos: ReactNode;
  badges: ReactNode;
  /** Bloque a todo el ancho entre las dos filas (por ejemplo, el motivo de rechazo). */
  detalle?: ReactNode;
  info?: ReactNode;
  acciones?: ReactNode;
}) {
  return (
    <li className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-border bg-white p-4 shadow-xs sm:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold break-words text-foreground">{titulo}</h2>
          <div className="mt-1 flex flex-col gap-2">{datos}</div>
        </div>
        <div className="order-first flex flex-wrap items-start gap-2 sm:order-none sm:max-w-1/2 sm:shrink-0 sm:justify-end">
          {badges}
        </div>
      </div>

      {detalle}

      <div className="flex min-h-11 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        {/* En escritorio se queda aunque esté vacío: así los botones siguen a la derecha. */}
        <div className="flex min-w-0 flex-1 flex-col gap-1 max-sm:empty:hidden">{info}</div>
        <div className="flex flex-wrap gap-2 empty:hidden *:grow *:basis-32 sm:justify-end sm:*:grow-0 sm:*:basis-auto">
          {acciones}
        </div>
      </div>
    </li>
  );
}
