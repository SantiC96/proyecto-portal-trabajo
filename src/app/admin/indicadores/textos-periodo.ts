import { desdePeriodo, type Agrupacion, type Periodo } from "@/lib/indicadores-periodo";
import {
  formatDiaMesCorto,
  formatMesAnio,
  formatMesCorto,
  partesFechaSinHora,
} from "@/lib/fechas";
import { formatNumero } from "@/components/indicadores/formato";

// Textos de las fechas del gráfico de evolución: eje, tooltip, alcance y
// conclusión, según se agrupe por día, semana o mes (decisión 032, punto 6).

export const TEXTOS_AGRUPACION: Record<
  Agrupacion,
  { unidad: string; columna: string; cadaPunto: string }
> = {
  dia: { unidad: "día", columna: "Día", cadaPunto: "un punto por día" },
  semana: {
    unidad: "semana",
    columna: "Semana",
    cadaPunto: "un punto por semana, de lunes a domingo",
  },
  mes: { unidad: "mes", columna: "Mes", cadaPunto: "un punto por mes" },
};

export function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** "2026-10-25": la fecha de un momento en Argentina. */
function fechaArgentina(momento: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(
    momento,
  );
}

function sumarDias(fecha: string, dias: number): string {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  return new Date(Date.UTC(anio, mes - 1, dia + dias)).toISOString().slice(0, 10);
}

/** "12 de octubre de 2026" (o sin el año). */
function textoDia(fecha: string, conAnio = true): string {
  const p = partesFechaSinHora(fecha);
  if (!p) return "—";
  return conAnio ? `${p.dia} de ${p.mes} de ${p.anio}` : `${p.dia} de ${p.mes}`;
}

/** "del 6 al 12 de octubre de 2026", "del 29 de septiembre al 5 de octubre de 2026". */
function textoRango(desde: string, hasta: string, conAnio = true): string {
  const a = partesFechaSinHora(desde);
  const b = partesFechaSinHora(hasta);
  if (!a || !b) return "—";
  if (desde === hasta) return `del ${textoDia(hasta, conAnio)}`;
  const final = textoDia(hasta, conAnio);
  if (a.anio !== b.anio) return `del ${textoDia(desde, true)} al ${textoDia(hasta, true)}`;
  if (a.mes !== b.mes) return `del ${a.dia} de ${a.mes} al ${final}`;
  return `del ${a.dia} al ${final}`;
}

/** "Marzo", o "Marzo de 2026" si el gráfico abarca más de un año. */
function textoMes(mes: string, variosAnios: boolean): string {
  const texto = formatMesAnio(mes);
  return capitalizar(variosAnios ? texto : texto.split(" de ")[0]);
}

/** Las fechas de un punto del gráfico, con los días que abarca de verdad. */
export type FechasPunto = {
  clave: string;
  /** Etiqueta corta del eje X. */
  eje: string;
  /** Fecha completa o rango, para el tooltip y "Ver datos". */
  detalle: string;
  desde: string;
  hasta: string;
};

/**
 * Las fechas de cada fila de la serie. La primera y la última semana pueden
 * quedar cortadas por el período: su rango va del primer día contado al
 * último (hoy).
 */
export function fechasDeLaSerie(
  inicios: string[],
  agrupacion: Agrupacion,
  periodo: Periodo,
): FechasPunto[] {
  const hoy = fechaArgentina(new Date());
  const inicioPeriodo = desdePeriodo(periodo);
  const primerDia = inicioPeriodo ? fechaArgentina(new Date(inicioPeriodo)) : undefined;

  return inicios.map((valor) => {
    const inicio = valor.slice(0, 10);

    if (agrupacion === "dia") {
      const p = partesFechaSinHora(inicio);
      return {
        clave: inicio,
        eje: formatDiaMesCorto(inicio),
        detalle: p ? `${capitalizar(p.diaSemana)} ${textoDia(inicio)}` : "—",
        desde: inicio,
        hasta: inicio,
      };
    }

    if (agrupacion === "semana") {
      const desde = primerDia && primerDia > inicio ? primerDia : inicio;
      const domingo = sumarDias(inicio, 6);
      const hasta = domingo > hoy ? hoy : domingo;
      return {
        clave: inicio,
        eje: formatDiaMesCorto(desde),
        detalle: capitalizar(textoRango(desde, hasta)),
        desde,
        hasta,
      };
    }

    // El año ("ene 26") lo agrega GraficoArea a las etiquetas que muestra.
    return {
      clave: inicio,
      eje: formatMesCorto(inicio),
      detalle: capitalizar(formatMesAnio(inicio)),
      desde: inicio,
      hasta: inicio,
    };
  });
}

/** "Del 25 de septiembre al 25 de octubre de 2026", "De enero a octubre de 2026". */
export function textoAlcance(datos: FechasPunto[], agrupacion: Agrupacion): string | undefined {
  const primero = datos[0];
  const ultimo = datos.at(-1);
  if (!primero || !ultimo) return undefined;
  if (agrupacion !== "mes") return capitalizar(textoRango(primero.desde, ultimo.hasta));
  if (primero.clave === ultimo.clave) return `En ${formatMesAnio(ultimo.clave)}`;
  const mismoAnio = primero.clave.slice(0, 4) === ultimo.clave.slice(0, 4);
  return `De ${textoMes(primero.clave, !mismoAnio).toLowerCase()} a ${formatMesAnio(ultimo.clave)}`;
}

/** "Del 25 de septiembre al 25 de octubre de 2026": del primer día contado a hoy. */
export function textoRangoCompleto(datos: FechasPunto[]): string | undefined {
  const primero = datos[0];
  if (!primero) return undefined;
  return capitalizar(textoRango(primero.desde, fechaArgentina(new Date())));
}

/** "El 12 de octubre fue el día con más postulaciones: 9". */
export function conclusionMayor(
  mayor: FechasPunto,
  cantidad: number,
  agrupacion: Agrupacion,
  variosAnios: boolean,
): string {
  const texto = formatNumero(cantidad);
  switch (agrupacion) {
    case "dia":
      return `El ${textoDia(mayor.clave, variosAnios)} fue el día con más postulaciones: ${texto}`;
    case "semana":
      return `La semana ${textoRango(mayor.desde, mayor.hasta, variosAnios)} fue la de más postulaciones: ${texto}`;
    case "mes":
      return `${textoMes(mayor.clave, variosAnios)} fue el mes con más postulaciones: ${texto}`;
  }
}
