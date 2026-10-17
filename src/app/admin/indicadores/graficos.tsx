import { formatMesAnio, formatMesCorto } from "@/lib/fechas";
import type { PostulacionesMes, PostulacionesRubro } from "@/lib/admin/indicadores";
import { cn } from "@/lib/utils";
import { formatNumero } from "./grupo-indicadores";

// Gráficos con CSS, sin librerías. Las barras son decorativas (aria-hidden):
// los lectores de pantalla leen la tabla equivalente (sr-only), y los valores
// están siempre visibles junto a cada barra.

function porcentaje(valor: number, maximo: number): number {
  if (maximo <= 0) return 0;
  return Math.max((valor / maximo) * 100, valor > 0 ? 2 : 0);
}

function textoPostulaciones(cantidad: number): string {
  return `${formatNumero(cantidad)} postulaci${cantidad === 1 ? "ón" : "ones"}`;
}

export function GraficoPorMes({ meses }: { meses: PostulacionesMes[] }) {
  const maximo = Math.max(0, ...meses.map((m) => m.cantidad));

  return (
    <>
      <div className="flex h-48 items-stretch gap-1 sm:gap-2" aria-hidden="true">
        {meses.map((m) => (
            <div
              key={m.mes}
              className="flex min-w-0 flex-1 flex-col items-center"
              title={`${formatMesAnio(m.mes)}: ${textoPostulaciones(m.cantidad)}`}
            >
              <div className="flex w-full flex-1 flex-col items-center justify-end border-b border-border">
                <span className="mb-1 text-xs font-medium tabular-nums text-foreground">
                  {formatNumero(m.cantidad)}
                </span>
                <div
                  className="w-full max-w-8 rounded-t bg-primary"
                  style={{ height: `${porcentaje(m.cantidad, maximo) * 0.8}%` }}
                />
              </div>
              <span className="mt-1.5 text-xs text-muted-foreground">{formatMesCorto(m.mes)}</span>
            </div>
        ))}
      </div>

      <table className="sr-only">
        <caption>Postulaciones por mes, últimos 12 meses</caption>
        <thead>
          <tr>
            <th scope="col">Mes</th>
            <th scope="col">Postulaciones</th>
          </tr>
        </thead>
        <tbody>
          {meses.map((m) => (
            <tr key={m.mes}>
              <th scope="row">{formatMesAnio(m.mes)}</th>
              <td>{formatNumero(m.cantidad)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

export function GraficoPorRubro({ rubros }: { rubros: PostulacionesRubro[] }) {
  const maximo = Math.max(0, ...rubros.map((r) => r.cantidad));

  return (
    <>
      <ul className="flex flex-col gap-3" aria-hidden="true">
        {rubros.map((r) => (
          <li key={r.rubro} title={`${r.rubro}: ${textoPostulaciones(r.cantidad)}`}>
            <p className="truncate text-sm text-foreground">{r.rubro}</p>
            <div className="mt-1 flex items-center gap-2">
              <div className="h-3 min-w-0 flex-1">
                <div
                  className={cn("h-full rounded-r", r.es_otros ? "bg-muted-icon" : "bg-primary")}
                  style={{ width: `${porcentaje(r.cantidad, maximo)}%` }}
                />
              </div>
              <span className="w-12 shrink-0 text-right text-sm font-medium tabular-nums text-foreground">
                {formatNumero(r.cantidad)}
              </span>
            </div>
          </li>
        ))}
      </ul>

      <table className="sr-only">
        <caption>Postulaciones por rubro de la oferta</caption>
        <thead>
          <tr>
            <th scope="col">Rubro</th>
            <th scope="col">Postulaciones</th>
          </tr>
        </thead>
        <tbody>
          {rubros.map((r) => (
            <tr key={r.rubro}>
              <th scope="row">{r.rubro}</th>
              <td>{formatNumero(r.cantidad)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
