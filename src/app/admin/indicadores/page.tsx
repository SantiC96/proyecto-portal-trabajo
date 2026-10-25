import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import {
  BookOpen,
  CalendarCheck,
  ChartColumn,
  CircleCheckBig,
  Clock,
  FileText,
  Handshake,
  Megaphone,
  TrendingUp,
  UserX,
  Users,
} from "lucide-react";
import { requerirRolPagina } from "@/lib/auth";
import { logError } from "@/lib/logger";
import {
  obtenerIndicadores,
  type PostulacionesPeriodo,
  type PostulacionesRubro,
} from "@/lib/admin/indicadores";
import { desdePeriodo, leerPeriodo, type Agrupacion, type Periodo } from "@/lib/indicadores-periodo";
import type { FilaIndicadoresPortal } from "@/types/db";
import {
  formatDiaMesCorto,
  formatMesAnio,
  formatMesCorto,
  partesFechaSinHora,
} from "@/lib/fechas";
import { EstadoVacio, ErrorListado } from "@/components/ui/estado-listado";
import { EncabezadoPagina } from "@/components/ui/encabezado-pagina";
import { SelectorPeriodo } from "@/components/indicadores/selector-periodo";
import { GrillaNumeros, TarjetaNumero } from "@/components/indicadores/tarjeta-numero";
import {
  IndicadorChico,
  TarjetaGrafico,
  type TablaDatos,
} from "@/components/indicadores/tarjeta-grafico";
import { GraficoArea, type PuntoArea } from "@/components/indicadores/grafico-area";
import { GraficoDona, type ParteDona } from "@/components/indicadores/grafico-dona";
import { formatDecimal, formatNumero, formatPorcentaje } from "@/components/indicadores/formato";
import { EsqueletoIndicadores } from "./esqueleto-indicadores";

export const metadata: Metadata = {
  title: "Indicadores | Panel municipal | Portal de Empleo Funes",
};

const RUTA = "/admin/indicadores";

export default async function IndicadoresPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>;
}) {
  await requerirRolPagina("municipalidad");
  const sp = await searchParams;
  const periodo = leerPeriodo(sp.periodo);

  return (
    <section className="flex flex-col gap-6">
      <EncabezadoPagina
        className="sm:flex-col sm:items-stretch xl:flex-row xl:items-end"
        titulo="Indicadores"
        bajada="Cómo viene funcionando el Portal de Empleo, para informar al municipio."
        acciones={<SelectorPeriodo ruta={RUTA} periodo={periodo} />}
      />

      <Suspense key={periodo} fallback={<EsqueletoIndicadores />}>
        <ContenidoIndicadores periodo={periodo} />
      </Suspense>
    </section>
  );
}

function hayActividad(i: FilaIndicadoresPortal): boolean {
  return (
    i.postulaciones_nuevas +
      i.derivaciones_empresas +
      i.contrataciones +
      i.rechazos_empresas +
      i.no_seleccionados_oficina +
      i.pre_entrevistas_realizadas +
      i.cursos_asignados +
      i.cursos_completados >
    0
  );
}

async function ContenidoIndicadores({ periodo }: { periodo: Periodo }) {
  const { agrupacion, indicadores, porPeriodo, porRubro } = await obtenerIndicadores(periodo);

  if (indicadores.error || !indicadores.data) {
    const ref = logError("indicadores_portal", indicadores.error ?? "sin datos", { periodo });
    return (
      <ErrorListado
        mensaje="No pudimos cargar los indicadores. Intentá de nuevo en unos minutos."
        refError={ref}
      />
    );
  }

  if (porPeriodo.error) logError("postulaciones_por_periodo", porPeriodo.error, { periodo });
  if (porRubro.error) logError("postulaciones_por_rubro", porRubro.error, { periodo });

  const i = indicadores.data;

  return (
    <div className="flex flex-col gap-6">
      <GrillaNumeros>
        <TarjetaNumero
          icono={Users}
          valor={formatNumero(i.postulantes_registrados)}
          etiqueta="Postulantes registrados"
          subtitulo="En total"
          href="/admin/postulantes"
        />
        <TarjetaNumero
          icono={Megaphone}
          valor={formatNumero(i.ofertas_vigentes)}
          etiqueta="Ofertas vigentes"
          subtitulo="Publicadas hoy en el portal"
          href="/admin/ofertas?estado=activa"
        />
        <TarjetaNumero
          icono={FileText}
          valor={formatNumero(i.postulaciones_nuevas)}
          etiqueta="Postulaciones nuevas"
          subtitulo="En el período"
          href="/admin/postulaciones"
        />
        <TarjetaNumero
          icono={Handshake}
          valor={formatNumero(i.contrataciones)}
          etiqueta="Contrataciones"
          subtitulo={
            i.tasa_contratacion === null
              ? "Sin resultados de empresas en el período"
              : `Tasa de contratación: ${formatDecimal(i.tasa_contratacion)} %`
          }
          href="/admin/postulaciones?estado=contratado"
        />
      </GrillaNumeros>

      <PostulacionesEnElTiempo
        filas={porPeriodo.data}
        agrupacion={agrupacion}
        periodo={periodo}
        error={Boolean(porPeriodo.error)}
      />

      {hayActividad(i) ? (
        <>
          <div className="grid grid-cols-1 gap-4 lg:gap-6 xl:grid-cols-3">
            <PostulacionesPorRubro rubros={porRubro.data} error={Boolean(porRubro.error)} />
            <ResultadoDerivaciones i={i} />
            <Empresas i={i} />
          </div>
          <ProcesoOficina i={i} />
        </>
      ) : (
        <>
          <EstadoVacio
            tipo="sin-registros"
            icono={ChartColumn}
            titulo="No hubo actividad en este período"
            descripcion="No se registraron postulaciones, derivaciones ni cursos. Probá con un período más largo."
            accion={
              periodo !== "todo" ? (
                <Link href={`${RUTA}?periodo=todo`} className="btn-secundario">
                  Ver desde el inicio
                </Link>
              ) : undefined
            }
          />
          {/* Las empresas no dependen del período. */}
          <div className="grid grid-cols-1 gap-4 lg:gap-6 xl:grid-cols-3">
            <Empresas i={i} />
          </div>
        </>
      )}
    </div>
  );
}

// ── Postulaciones en el tiempo ────────────────────────────────────────────

const TEXTOS_AGRUPACION: Record<
  Agrupacion,
  { titulo: string; unidad: string; columna: string; cadaPunto: string }
> = {
  dia: { titulo: "Postulaciones por día", unidad: "día", columna: "Día", cadaPunto: "un punto por día" },
  semana: {
    titulo: "Postulaciones por semana",
    unidad: "semana",
    columna: "Semana",
    cadaPunto: "un punto por semana, de lunes a domingo",
  },
  mes: { titulo: "Postulaciones por mes", unidad: "mes", columna: "Mes", cadaPunto: "un punto por mes" },
};

function capitalizar(texto: string): string {
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

/** Un punto del gráfico con los días que abarca de verdad. */
type PuntoConRango = PuntoArea & { desde: string; hasta: string };

/**
 * Las filas de postulaciones_por_periodo con sus textos. La primera y la
 * última semana pueden quedar cortadas por el período: su rango va del
 * primer día contado al último (hoy).
 */
function puntosDelGrafico(
  filas: PostulacionesPeriodo[],
  agrupacion: Agrupacion,
  periodo: Periodo,
): PuntoConRango[] {
  const hoy = fechaArgentina(new Date());
  const inicioPeriodo = desdePeriodo(periodo);
  const primerDia = inicioPeriodo ? fechaArgentina(new Date(inicioPeriodo)) : undefined;

  return filas.map((f) => {
    const inicio = f.inicio.slice(0, 10);
    const cantidad = Number(f.cantidad);

    if (agrupacion === "dia") {
      const p = partesFechaSinHora(inicio);
      return {
        clave: inicio,
        cantidad,
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
        cantidad,
        eje: formatDiaMesCorto(desde),
        detalle: capitalizar(textoRango(desde, hasta)),
        desde,
        hasta,
      };
    }

    // El año ("ene 26") lo agrega GraficoArea a las etiquetas que muestra.
    return {
      clave: inicio,
      cantidad,
      eje: formatMesCorto(inicio),
      detalle: capitalizar(formatMesAnio(inicio)),
      desde: inicio,
      hasta: inicio,
    };
  });
}

/** "Del 25 de septiembre al 25 de octubre de 2026", "De enero a octubre de 2026". */
function textoAlcance(datos: PuntoConRango[], agrupacion: Agrupacion): string | undefined {
  const primero = datos[0];
  const ultimo = datos.at(-1);
  if (!primero || !ultimo) return undefined;
  if (agrupacion !== "mes") return capitalizar(textoRango(primero.desde, ultimo.hasta));
  if (primero.clave === ultimo.clave) return `En ${formatMesAnio(ultimo.clave)}`;
  const mismoAnio = primero.clave.slice(0, 4) === ultimo.clave.slice(0, 4);
  return `De ${textoMes(primero.clave, !mismoAnio).toLowerCase()} a ${formatMesAnio(ultimo.clave)}`;
}

/** "Del 25 de septiembre al 25 de octubre de 2026": del primer día contado a hoy. */
function textoRangoCompleto(datos: PuntoConRango[]): string | undefined {
  const primero = datos[0];
  if (!primero) return undefined;
  return capitalizar(textoRango(primero.desde, fechaArgentina(new Date())));
}

function conclusionArea(
  mayor: PuntoConRango,
  agrupacion: Agrupacion,
  variosAnios: boolean,
): string {
  const cantidad = formatNumero(mayor.cantidad);
  switch (agrupacion) {
    case "dia":
      return `El ${textoDia(mayor.clave, variosAnios)} fue el día con más postulaciones: ${cantidad}`;
    case "semana":
      return `La semana ${textoRango(mayor.desde, mayor.hasta, variosAnios)} fue la de más postulaciones: ${cantidad}`;
    case "mes":
      return `${textoMes(mayor.clave, variosAnios)} fue el mes con más postulaciones: ${cantidad}`;
  }
}

function PostulacionesEnElTiempo({
  filas,
  agrupacion,
  periodo,
  error,
}: {
  filas: PostulacionesPeriodo[];
  agrupacion: Agrupacion;
  periodo: Periodo;
  error: boolean;
}) {
  const textos = TEXTOS_AGRUPACION[agrupacion];
  const datos = puntosDelGrafico(filas, agrupacion, periodo);
  // Cuenta lo mismo que postulaciones_nuevas: coincide con la tarjeta "Postulaciones nuevas".
  const total = datos.reduce((s, p) => s + p.cantidad, 0);
  const conDatos = !error && total > 0;
  const alcance = textoAlcance(datos, agrupacion);
  const variosAnios = new Set(datos.map((p) => p.clave.slice(0, 4))).size > 1;
  // El más reciente gana los empates.
  const mayor = conDatos
    ? datos.reduce((a, b) => (b.cantidad >= a.cantidad ? b : a), datos[0])
    : undefined;
  const conclusion = mayor ? conclusionArea(mayor, agrupacion, variosAnios) : undefined;

  return (
    <TarjetaGrafico
      titulo={textos.titulo}
      descripcion={alcance ? `${alcance}, ${textos.cadaPunto}.` : undefined}
      destacado={error ? undefined : { valor: formatNumero(total), etiqueta: "en el período" }}
      conclusion={conclusion}
      iconoConclusion={TrendingUp}
      tabla={
        conDatos
          ? {
              titulo: `${textos.titulo}. ${alcance}.`,
              columnas: [textos.columna, "Postulaciones"],
              filas: datos.map((p) => ({
                clave: p.clave,
                celdas: [p.detalle, formatNumero(p.cantidad)],
              })),
            }
          : undefined
      }
    >
      {error ? (
        <ErrorGrafico />
      ) : total === 0 ? (
        <p className="text-sm text-muted-foreground">No hubo postulaciones en el período.</p>
      ) : (
        <GraficoArea
          datos={datos}
          agrupacion={agrupacion}
          rango={textoRangoCompleto(datos)}
          serie="Postulaciones"
          resumen={`Gráfico de área de las postulaciones por ${textos.unidad}. ${alcance}. Total: ${formatNumero(total)}. ${conclusion}.`}
        />
      )}
    </TarjetaGrafico>
  );
}

// ── Donas ─────────────────────────────────────────────────────────────────

function totalDe(partes: ParteDona[]): number {
  return partes.reduce((s, p) => s + p.cantidad, 0);
}

/** La parte con más cantidad (la primera si empatan); ninguna si todas son 0. */
function mayorParte(partes: ParteDona[]): ParteDona | undefined {
  return partes.reduce<ParteDona | undefined>(
    (a, b) => (b.cantidad > 0 && (!a || b.cantidad > a.cantidad) ? b : a),
    undefined,
  );
}

function tablaDona(titulo: string, columna: string, partes: ParteDona[]): TablaDatos {
  const total = totalDe(partes);
  return {
    titulo,
    columnas: [columna, "Cantidad", "Porcentaje"],
    filas: partes.map((p) => ({
      clave: p.clave,
      celdas: [p.nombre, formatNumero(p.cantidad), formatPorcentaje(p.cantidad, total)],
    })),
  };
}

function resumenDona(titulo: string, partes: ParteDona[]): string {
  const total = totalDe(partes);
  const detalle = partes
    .map((p) => `${p.nombre}: ${formatNumero(p.cantidad)} (${formatPorcentaje(p.cantidad, total)})`)
    .join("; ");
  return `Gráfico de dona. ${titulo}. Total: ${formatNumero(total)}. ${detalle}.`;
}

function PostulacionesPorRubro({
  rubros,
  error,
}: {
  rubros: PostulacionesRubro[];
  error: boolean;
}) {
  const partes: ParteDona[] = rubros.map((r) => ({
    clave: r.es_otros ? "otros" : r.rubro,
    nombre: r.rubro,
    cantidad: Number(r.cantidad),
  }));
  // "Otros rubros" junta varios: la conclusión nombra el rubro con más postulaciones.
  const mayor = mayorParte(partes.filter((p) => p.clave !== "otros"));
  const conDatos = !error && totalDe(partes) > 0;

  return (
    <TarjetaGrafico
      titulo="Postulaciones por rubro"
      descripcion="Según el rubro de la oferta. Una postulación cuenta en cada rubro de su oferta."
      conclusion={
        conDatos && mayor
          ? `${mayor.nombre} es el rubro con más postulaciones: ${formatNumero(mayor.cantidad)}`
          : undefined
      }
      tabla={conDatos ? tablaDona("Postulaciones por rubro de la oferta", "Rubro", partes) : undefined}
    >
      {error ? (
        <ErrorGrafico />
      ) : (
        <GraficoDona
          partes={partes}
          unidad="postulaciones"
          resaltada={mayor?.clave}
          resumen={resumenDona("Postulaciones por rubro", partes)}
          vacio="No hubo postulaciones en el período."
        />
      )}
    </TarjetaGrafico>
  );
}

const CONCLUSION_DERIVACIONES: Record<string, string> = {
  contratados: "La mayor parte de las derivaciones terminó en una contratación",
  rechazadas: "La mayor parte de las derivaciones no fue seleccionada por la empresa",
  proceso: "La mayor parte de las derivaciones sigue en proceso",
};

function ResultadoDerivaciones({ i }: { i: FilaIndicadoresPortal }) {
  // Derivaciones del período sin una contratación ni un rechazo de la empresa
  // contados en el período.
  const enProceso = Math.max(0, i.derivaciones_empresas - i.contrataciones - i.rechazos_empresas);
  const partes: ParteDona[] = [
    { clave: "contratados", nombre: "Contrataciones", cantidad: i.contrataciones },
    { clave: "rechazadas", nombre: "Rechazadas por la empresa", cantidad: i.rechazos_empresas },
    { clave: "proceso", nombre: "En proceso", cantidad: enProceso },
  ];
  const mayor = mayorParte(partes);

  return (
    <TarjetaGrafico
      titulo="Resultado de las derivaciones"
      descripcion="Qué pasó con los postulantes que la Oficina derivó a las empresas en el período."
      conclusion={mayor ? CONCLUSION_DERIVACIONES[mayor.clave] : undefined}
      tabla={mayor ? tablaDona("Resultado de las derivaciones", "Resultado", partes) : undefined}
    >
      <GraficoDona
        partes={partes}
        unidad="derivaciones"
        resaltada={mayor?.clave}
        resumen={resumenDona("Resultado de las derivaciones", partes)}
        vacio="No hubo derivaciones en el período."
      />
    </TarjetaGrafico>
  );
}

function Empresas({ i }: { i: FilaIndicadoresPortal }) {
  const partes: ParteDona[] = [
    { clave: "aprobadas", nombre: "Aprobadas", cantidad: i.empresas_aprobadas },
    { clave: "pendientes", nombre: "Pendientes", cantidad: i.empresas_pendientes },
    { clave: "rechazadas", nombre: "Rechazadas", cantidad: i.empresas_rechazadas },
  ];
  const mayor = mayorParte(partes);
  const pendientes = i.empresas_pendientes;

  return (
    <TarjetaGrafico
      titulo="Empresas"
      descripcion="Estado de las empresas registradas. No depende del período elegido."
      conclusion={
        !mayor
          ? undefined
          : pendientes > 0
            ? `${formatNumero(pendientes)} ${pendientes === 1 ? "empresa espera" : "empresas esperan"} tu revisión`
            : "No hay empresas esperando tu revisión"
      }
      tabla={mayor ? tablaDona("Empresas por estado", "Estado", partes) : undefined}
    >
      <GraficoDona
        partes={partes}
        unidad="empresas"
        resaltada={mayor?.clave}
        resumen={resumenDona("Empresas por estado", partes)}
        vacio="Todavía no hay empresas registradas."
      />
    </TarjetaGrafico>
  );
}

// ── Proceso de la Oficina ─────────────────────────────────────────────────

function ProcesoOficina({ i }: { i: FilaIndicadoresPortal }) {
  return (
    <section aria-labelledby="titulo-proceso" className="tarjeta px-4 py-[18px] sm:p-6">
      <h2 id="titulo-proceso" className="text-lg leading-snug font-extrabold text-heading">
        Proceso de la Oficina
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">En el período elegido.</p>
      <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-5">
        <IndicadorChico
          icono={CalendarCheck}
          valor={formatNumero(i.pre_entrevistas_realizadas)}
          texto="Pre-entrevistas realizadas"
        />
        <IndicadorChico
          icono={UserX}
          valor={formatNumero(i.no_seleccionados_oficina)}
          texto="No seleccionados por la Oficina"
        />
        <IndicadorChico
          icono={Clock}
          valor={
            i.dias_promedio_derivacion === null ? "—" : formatDecimal(i.dias_promedio_derivacion)
          }
          texto="Días promedio hasta la derivación"
        />
        <IndicadorChico
          icono={BookOpen}
          valor={formatNumero(i.cursos_asignados)}
          texto="Cursos asignados"
        />
        <IndicadorChico
          icono={CircleCheckBig}
          valor={formatNumero(i.cursos_completados)}
          texto="Cursos completados"
        />
      </div>
    </section>
  );
}

function ErrorGrafico() {
  return (
    <p role="alert" className="text-sm text-danger">
      No pudimos cargar este gráfico. Intentá de nuevo en unos minutos.
    </p>
  );
}
