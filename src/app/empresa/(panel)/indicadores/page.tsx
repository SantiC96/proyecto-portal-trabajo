import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Briefcase, ChartColumn, Clock, Megaphone, Plus, UserCheck, Users } from "lucide-react";
import { requerirEmpresaPagina } from "@/lib/auth";
import { logError } from "@/lib/logger";
import { obtenerIndicadoresEmpresa } from "@/lib/empresa/indicadores";
import { leerPeriodo, type Periodo } from "@/lib/indicadores-periodo";
import { indicadoresDeEjemplo } from "@/lib/indicadores-ejemplo";
import { estadoVencimiento } from "@/lib/ofertas-vencimiento";
import {
  ESTADO_OFERTA_EMPRESA_LABEL,
  ESTADO_OFERTA_EMPRESA_TONO,
  type EstadoOfertaEmpresa,
} from "@/lib/oferta-estados";
import { formatFechaCorta } from "@/lib/fechas";
import type { FilaIndicadoresEmpresa, FilaIndicadoresPorOfertaEmpresa } from "@/types/db";
import { EstadoVacio, ErrorListado } from "@/components/ui/estado-listado";
import { Badge } from "@/components/ui/badge";
import { BarraProgreso } from "@/components/ui/barra-progreso";
import { EncabezadoPagina } from "@/components/ui/encabezado-pagina";
import { SelectorPeriodo } from "@/components/indicadores/selector-periodo";
import { GrillaNumeros, TarjetaNumero } from "@/components/indicadores/tarjeta-numero";
import { TarjetaGrafico, type TablaDatos } from "@/components/indicadores/tarjeta-grafico";
import { GraficoDona, type ParteDona } from "@/components/indicadores/grafico-dona";
import { BarrasOferta, LeyendaMedidasOferta } from "@/components/indicadores/barras-oferta";
import { formatDecimal, formatNumero, formatPorcentaje } from "@/components/indicadores/formato";
import { EsqueletoIndicadoresEmpresa } from "./esqueleto-indicadores-empresa";

export const metadata: Metadata = {
  title: "Indicadores | Panel de empresa | Portal de Empleo Funes",
};

const RUTA = "/empresa/indicadores";

export default async function IndicadoresEmpresaPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>;
}) {
  await requerirEmpresaPagina("/empresa");
  const sp = await searchParams;
  const periodo = leerPeriodo(sp.periodo);

  return (
    <section className="flex flex-col gap-6">
      <EncabezadoPagina
        className="sm:flex-col sm:items-stretch xl:flex-row xl:items-end"
        titulo="Indicadores"
        bajada="Cómo les va a tus ofertas y a tus candidatos."
        acciones={<SelectorPeriodo ruta={RUTA} periodo={periodo} />}
      />

      <Suspense key={periodo} fallback={<EsqueletoIndicadoresEmpresa />}>
        <ContenidoIndicadores periodo={periodo} />
      </Suspense>
    </section>
  );
}

function hayActividad(i: FilaIndicadoresEmpresa): boolean {
  return (
    i.candidatos_derivados + i.entrevistas_coordinadas + i.seleccionados + i.no_seleccionados > 0
  );
}

async function ContenidoIndicadores({ periodo }: { periodo: Periodo }) {
  const { indicadores, porOferta } = await obtenerIndicadoresEmpresa(periodo);

  if (indicadores.error || !indicadores.data) {
    const ref = logError("indicadores_empresa", indicadores.error ?? "sin datos", { periodo });
    return (
      <ErrorListado
        mensaje="No pudimos cargar los indicadores. Intentá de nuevo en unos minutos."
        refError={ref}
      />
    );
  }

  const i = indicadores.data;

  if (i.ofertas_totales === 0) {
    return (
      <EstadoVacio
        tipo="sin-registros"
        icono={Briefcase}
        titulo="Todavía no publicaste ofertas"
        descripcion="Cuando publiques una oferta y la oficina te derive candidatos, vas a ver acá cómo avanza cada búsqueda."
        accion={
          <Link href="/empresa/ofertas/nueva" className="btn-primario">
            <Plus aria-hidden="true" />
            Publicar mi primera oferta
          </Link>
        }
      />
    );
  }

  const refPorOferta = porOferta.error
    ? logError("indicadores_por_oferta_empresa", porOferta.error, { periodo })
    : undefined;

  return (
    <div className="flex flex-col gap-6">
      <GrillaNumeros>
        <TarjetaNumero
          icono={Megaphone}
          valor={formatNumero(i.ofertas_vigentes)}
          etiqueta="Ofertas vigentes"
          subtitulo="Publicadas hoy en el portal"
        />
        <TarjetaNumero
          icono={Users}
          valor={formatNumero(i.candidatos_derivados)}
          etiqueta="Candidatos derivados"
          subtitulo={`${formatNumero(i.entrevistas_coordinadas)} ${i.entrevistas_coordinadas === 1 ? "entrevista coordinada" : "entrevistas coordinadas"} en el período`}
        />
        <TarjetaNumero
          icono={UserCheck}
          valor={formatNumero(i.seleccionados)}
          etiqueta="Seleccionados"
          subtitulo={
            i.vacantes_totales > 0
              ? `Vacantes cubiertas: ${formatNumero(i.vacantes_cubiertas)} de ${formatNumero(i.vacantes_totales)}`
              : "En el período"
          }
        />
        <TarjetaNumero
          icono={Clock}
          valor={
            i.dias_promedio_contratacion === null ? "—" : formatDecimal(i.dias_promedio_contratacion)
          }
          etiqueta="Días hasta la contratación"
          subtitulo={
            i.dias_promedio_contratacion === null
              ? "Sin seleccionados en el período"
              : "Promedio desde la derivación"
          }
        />
      </GrillaNumeros>

      {hayActividad(i) ? (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
            <TusOfertas i={i} />
            <TusCandidatos i={i} />
          </div>
          {porOferta.error ? (
            <ErrorListado
              mensaje="No pudimos cargar el detalle por oferta. Intentá de nuevo en unos minutos."
              refError={refPorOferta}
            />
          ) : (
            <PorOferta ofertas={porOferta.data} />
          )}
        </>
      ) : (
        <>
          <div className="tarjeta flex flex-col items-center gap-3 px-4 py-10 text-center sm:px-8">
            <span
              aria-hidden="true"
              className="flex size-12 items-center justify-center rounded-full bg-secondary text-primary"
            >
              <ChartColumn className="size-6" />
            </span>
            <h2 className="text-lg font-extrabold text-heading">
              Todavía no hay actividad en este período
            </h2>
            <p className="max-w-lg text-[15px] text-muted-foreground">
              Cuando publiques ofertas y la Oficina de Empleo te derive candidatos, vas a ver acá
              cómo avanzan.
            </p>
            <div className="mt-1 flex flex-col gap-3 sm:flex-row">
              <Link href="/empresa/ofertas/nueva" className="btn-primario">
                <Plus aria-hidden="true" />
                Publicar oferta
              </Link>
              {periodo !== "todo" && (
                <Link href={`${RUTA}?periodo=todo`} className="btn-neutro">
                  Ver desde el inicio
                </Link>
              )}
            </div>
          </div>
          {/* El estado de las ofertas no depende del período. */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
            <TusOfertas i={i} />
          </div>
        </>
      )}
    </div>
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

const CONCLUSION_OFERTAS: Record<string, string> = {
  vigentes: "La mayoría de tus ofertas están publicadas",
  revision: "La mayor parte de tus ofertas espera la revisión de la Oficina",
  rechazadas: "La mayor parte de tus ofertas fue rechazada: revisá el motivo y corregilas",
  cerradas: "La mayor parte de tus ofertas ya está cerrada",
  vencidas: "La mayor parte de tus ofertas venció: podés renovarlas desde Mis ofertas",
};

function TusOfertas({ i }: { i: FilaIndicadoresEmpresa }) {
  const partes: ParteDona[] = [
    { clave: "vigentes", nombre: "Vigentes", cantidad: i.ofertas_vigentes },
    { clave: "revision", nombre: "En revisión", cantidad: i.ofertas_pendientes },
    { clave: "rechazadas", nombre: "Rechazadas", cantidad: i.ofertas_rechazadas },
    { clave: "cerradas", nombre: "Cerradas", cantidad: i.ofertas_cerradas },
    { clave: "vencidas", nombre: "Vencidas", cantidad: i.ofertas_vencidas },
  ];
  const mayor = mayorParte(partes);

  return (
    <TarjetaGrafico
      titulo="Tus ofertas"
      descripcion="En qué estado están hoy. No depende del período elegido."
      conclusion={mayor ? CONCLUSION_OFERTAS[mayor.clave] : undefined}
      tabla={mayor ? tablaDona("Tus ofertas por estado", "Estado", partes) : undefined}
    >
      <GraficoDona
        partes={partes}
        unidad="ofertas"
        resaltada={mayor?.clave}
        resumen={resumenDona("Tus ofertas por estado", partes)}
        vacio="No tenés ofertas enviadas a la Oficina."
      />
    </TarjetaGrafico>
  );
}

const CONCLUSION_CANDIDATOS: Record<string, string> = {
  seleccionados: "La mayoría de tus candidatos fueron seleccionados",
  no_seleccionados: "La mayoría de tus candidatos no fueron seleccionados",
  proceso: "La mayoría de tus candidatos están en proceso",
};

function TusCandidatos({ i }: { i: FilaIndicadoresEmpresa }) {
  // Derivados del período sin un resultado contado en el período.
  const enProceso = Math.max(0, i.candidatos_derivados - i.seleccionados - i.no_seleccionados);
  const partes: ParteDona[] = [
    { clave: "seleccionados", nombre: "Seleccionados", cantidad: i.seleccionados },
    { clave: "no_seleccionados", nombre: "No seleccionados", cantidad: i.no_seleccionados },
    { clave: "proceso", nombre: "En proceso", cantidad: enProceso },
  ];
  const mayor = mayorParte(partes);

  return (
    <TarjetaGrafico
      titulo="Tus candidatos"
      descripcion="Los que te derivó la Oficina de Empleo en el período y su resultado."
      conclusion={mayor ? CONCLUSION_CANDIDATOS[mayor.clave] : undefined}
      tabla={mayor ? tablaDona("Tus candidatos por resultado", "Resultado", partes) : undefined}
    >
      <GraficoDona
        partes={partes}
        unidad="candidatos"
        resaltada={mayor?.clave}
        resumen={resumenDona("Tus candidatos por resultado", partes)}
        vacio="No te derivaron candidatos en el período."
      />
    </TarjetaGrafico>
  );
}

// ── Por oferta ────────────────────────────────────────────────────────────

function estadoVisible(o: FilaIndicadoresPorOfertaEmpresa): EstadoOfertaEmpresa {
  return estadoVencimiento(o.estado, o.vence_en).vencida ? "vencida" : o.estado;
}

function textoCobertura(o: FilaIndicadoresPorOfertaEmpresa): string {
  return o.vacantes === null ? "—" : `${formatNumero(o.cubiertas)} de ${formatNumero(o.vacantes)}`;
}

/** El vencimiento solo tiene sentido mientras la oferta está publicada. */
function textoVence(o: FilaIndicadoresPorOfertaEmpresa): string {
  return o.estado === "activa" && o.vence_en ? formatFechaCorta(o.vence_en) : "—";
}

function PorOferta({ ofertas }: { ofertas: FilaIndicadoresPorOfertaEmpresa[] }) {
  const enlazar = !indicadoresDeEjemplo();
  const maximo = Math.max(1, ...ofertas.map((o) => Math.max(o.derivados, o.entrevistas, o.seleccionados)));
  const conMasDerivados = ofertas.reduce<FilaIndicadoresPorOfertaEmpresa | undefined>(
    (a, b) => (b.derivados > 0 && (!a || b.derivados > a.derivados) ? b : a),
    undefined,
  );

  return (
    <TarjetaGrafico
      titulo="Por oferta"
      descripcion="Derivados, entrevistas y seleccionados del período. Las vacantes cubiertas son desde la publicación."
      conclusion={
        conMasDerivados
          ? `${conMasDerivados.titulo} es la oferta con más candidatos derivados: ${formatNumero(conMasDerivados.derivados)}`
          : ofertas.length > 0
            ? "Ninguna oferta recibió candidatos derivados en el período"
            : undefined
      }
      encabezado={ofertas.length > 0 ? <LeyendaMedidasOferta /> : undefined}
      tabla={
        ofertas.length > 0
          ? {
              titulo: "Indicadores por oferta",
              columnas: [
                "Oferta",
                "Estado",
                "Derivados",
                "Entrevistas",
                "Seleccionados",
                "Vacantes cubiertas",
                "Vence",
              ],
              filas: ofertas.map((o) => ({
                clave: o.oferta_id,
                celdas: [
                  o.titulo,
                  ESTADO_OFERTA_EMPRESA_LABEL[estadoVisible(o)],
                  formatNumero(o.derivados),
                  formatNumero(o.entrevistas),
                  formatNumero(o.seleccionados),
                  textoCobertura(o),
                  textoVence(o),
                ],
              })),
            }
          : undefined
      }
    >
      {ofertas.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay ofertas con datos para mostrar.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {ofertas.map((o) => (
            <li key={o.oferta_id}>
              <TarjetaPorOferta oferta={o} maximo={maximo} enlazar={enlazar} />
            </li>
          ))}
        </ul>
      )}
    </TarjetaGrafico>
  );
}

function TarjetaPorOferta({
  oferta: o,
  maximo,
  enlazar,
}: {
  oferta: FilaIndicadoresPorOfertaEmpresa;
  maximo: number;
  /** Las ofertas de ejemplo no existen: su título no lleva link. */
  enlazar: boolean;
}) {
  const estado = estadoVisible(o);
  const porcentaje = o.vacantes ? (o.cubiertas * 100) / o.vacantes : 0;

  return (
    <article className="flex h-full flex-col gap-4 rounded-[var(--radius-lg)] border border-border bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="min-w-0 flex-1 basis-40 text-base leading-snug font-bold break-words">
          {enlazar ? (
            <Link
              href={`/empresa/ofertas/${o.oferta_id}`}
              className="rounded-[var(--radius-sm)] text-heading no-underline outline-none hover:text-primary hover:underline focus-visible:shadow-[var(--sombra-foco)]"
            >
              {o.titulo}
            </Link>
          ) : (
            <span className="text-heading">{o.titulo}</span>
          )}
        </h3>
        <Badge tono={ESTADO_OFERTA_EMPRESA_TONO[estado]} estado>
          {ESTADO_OFERTA_EMPRESA_LABEL[estado]}
        </Badge>
      </div>

      <BarrasOferta
        valores={{ derivados: o.derivados, entrevistas: o.entrevistas, seleccionados: o.seleccionados }}
        maximo={maximo}
        resumen={`${o.titulo}: ${formatNumero(o.derivados)} derivados, ${formatNumero(o.entrevistas)} entrevistas y ${formatNumero(o.seleccionados)} seleccionados en el período.`}
      />

      <div className="mt-auto flex flex-col gap-2">
        <p className="flex justify-between gap-3 text-sm">
          <span className="font-semibold text-control-foreground">Vacantes cubiertas</span>
          <span className="font-bold text-foreground tabular-nums">{textoCobertura(o)}</span>
        </p>
        {o.vacantes !== null && (
          <BarraProgreso
            porcentaje={porcentaje}
            etiqueta={`Vacantes cubiertas: ${formatNumero(o.cubiertas)} de ${formatNumero(o.vacantes)}`}
          />
        )}
      </div>
    </article>
  );
}
