import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Briefcase,
  Building2,
  CalendarCheck,
  ChartColumn,
  CircleCheckBig,
  ClipboardCheck,
  Clock,
  FileText,
  Handshake,
  Inbox,
  ListChecks,
  Percent,
  Send,
  Tags,
  TrendingUp,
  UserX,
  Users,
  type LucideIcon,
} from "lucide-react";
import { logError } from "@/lib/logger";
import {
  obtenerIndicadores,
  type EstadoPostulacionesPeriodo,
  type FilaSerie,
  type IndicadoresComparados,
  type OfertasVigentesRubro,
  type PostulacionesRubro,
  type UltimaPostulacion,
} from "@/lib/admin/indicadores";
import {
  BADGE_ESTADO_VISIBLE,
  estadoVisiblePostulacion,
} from "@/lib/admin/postulacion-estados";
import { PERIODO_LABEL, type Agrupacion, type Periodo } from "@/lib/indicadores-periodo";
import { formatFechaDiaMes, formatHora, formatFecha } from "@/lib/fechas";
import type { FilaIndicadoresPortal } from "@/types/db";
import { Badge } from "@/components/ui/badge";
import { EstadoVacio, ErrorListado } from "@/components/ui/estado-listado";
import { CeldaTabla, FilaTabla, Tabla } from "@/components/ui/tabla";
import { AparecerAlScroll } from "@/components/indicadores/aparecer-al-scroll";
import { BarrasVerticales, type BarraVertical } from "@/components/indicadores/barras-verticales";
import { GraficoArea, type SerieArea } from "@/components/indicadores/grafico-area";
import { GraficoDona, type ParteDona } from "@/components/indicadores/grafico-dona";
import {
  IndicadorChico,
  TarjetaGrafico,
  type TablaDatos,
} from "@/components/indicadores/tarjeta-grafico";
import { TarjetaTendencia, TextoVariacion } from "@/components/indicadores/tarjeta-tendencia";
import {
  formatDecimal,
  formatNumero,
  formatPorcentaje,
  variacionCantidad,
  variacionTasa,
  type Variacion,
} from "@/components/indicadores/formato";
import {
  TEXTOS_AGRUPACION,
  conclusionMayor,
  fechasDeLaSerie,
  textoAlcance,
  textoRangoCompleto,
} from "./textos-periodo";

export const RUTA_INDICADORES = "/admin/indicadores";

/** Radio de las tarjetas de esta pantalla (18 px). */
const RADIO = "h-full rounded-[var(--radius-indicador)]";

const COLOR_PRINCIPAL = "var(--color-primary)";
const COLOR_CLARO = "var(--color-grafico-verde-claro)";
const COLOR_GRIS = "var(--color-grafico-gris)";

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

export async function ContenidoIndicadores({ periodo }: { periodo: Periodo }) {
  const datos = await obtenerIndicadores(periodo);
  const { agrupacion, indicadores, comparados, series, estado, porRubro, ofertasPorRubro, ultimas } =
    datos;

  if (indicadores.error || !indicadores.data) {
    const ref = logError("indicadores_portal", indicadores.error ?? "sin datos", { periodo });
    return (
      <ErrorListado
        mensaje="No pudimos cargar los indicadores. Intentá de nuevo en unos minutos."
        refError={ref}
      />
    );
  }

  if (comparados.error) logError("indicadores_comparados", comparados.error, { periodo });
  if (series.error) logError("series_indicadores", series.error, { periodo });
  if (estado.error) logError("estado_postulaciones_periodo", estado.error, { periodo });
  if (porRubro.error) logError("postulaciones_por_rubro", porRubro.error, { periodo });
  if (ofertasPorRubro.error) logError("contar_ofertas_vigentes_por_rubro", ofertasPorRubro.error);
  if (ultimas.error) logError("admin_indicadores_ultimas_postulaciones", ultimas.error);

  const i = indicadores.data;

  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      <TarjetasPrincipales
        i={i}
        c={comparados.data}
        serie={series.error ? [] : series.data}
        periodo={periodo}
      />

      <div className="grid grid-cols-1 gap-4 lg:gap-6 xl:grid-cols-[1.85fr_1fr]">
        <AparecerAlScroll>
          <EvolucionGeneral
            filas={series.data}
            agrupacion={agrupacion}
            periodo={periodo}
            error={Boolean(series.error)}
          />
        </AparecerAlScroll>
        <AparecerAlScroll>
          <EstadoPostulaciones estado={estado.data} error={Boolean(estado.error)} />
        </AparecerAlScroll>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:gap-6 xl:grid-cols-[1fr_1.3fr_0.95fr]">
        <AparecerAlScroll>
          <OfertasPorArea rubros={ofertasPorRubro.data} error={Boolean(ofertasPorRubro.error)} />
        </AparecerAlScroll>
        <AparecerAlScroll>
          <UltimasPostulaciones
            filas={ultimas.data}
            error={Boolean(ultimas.error)}
            conFicha={!datos.deEjemplo}
          />
        </AparecerAlScroll>
        <AparecerAlScroll>
          <ResumenPeriodo i={i} c={comparados.data} />
        </AparecerAlScroll>
      </div>

      {hayActividad(i) ? (
        <>
          <div className="grid grid-cols-1 gap-4 lg:gap-6 xl:grid-cols-3">
            <AparecerAlScroll>
              <PostulacionesPorRubro rubros={porRubro.data} error={Boolean(porRubro.error)} />
            </AparecerAlScroll>
            <AparecerAlScroll>
              <ResultadoDerivaciones i={i} />
            </AparecerAlScroll>
            <AparecerAlScroll>
              <Empresas i={i} />
            </AparecerAlScroll>
          </div>
          <AparecerAlScroll>
            <ProcesoOficina i={i} />
          </AparecerAlScroll>
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
                <Link href={`${RUTA_INDICADORES}?periodo=todo`} className="btn-secundario">
                  Ver desde el inicio
                </Link>
              ) : undefined
            }
          />
          {/* Las empresas no dependen del período. */}
          <div className="grid grid-cols-1 gap-4 lg:gap-6 xl:grid-cols-3">
            <AparecerAlScroll>
              <Empresas i={i} />
            </AparecerAlScroll>
          </div>
        </>
      )}
    </div>
  );
}

// ── Fila 1: tarjetas con tendencia ────────────────────────────────────────

/** "24 nuevos en el período": la base de la variación cuando el número es otra cosa. */
function notaBase(cantidad: number, palabra: string, periodo: Periodo): string {
  return `${formatNumero(cantidad)} ${palabra} ${periodo === "todo" ? "desde el inicio" : "en el período"}`;
}

function TarjetasPrincipales({
  i,
  c,
  serie,
  periodo,
}: {
  i: FilaIndicadoresPortal;
  /** null si indicadores_comparados falló: los números de 047, sin variación. */
  c: IndicadoresComparados | null;
  serie: FilaSerie[];
  periodo: Periodo;
}) {
  const sinComparar: Variacion = { tipo: "sin-datos" };
  const tarjetas: {
    icono: LucideIcon;
    etiqueta: string;
    valor: number;
    serie: number[];
    variacion: Variacion;
    nota?: string;
    href: string;
  }[] = [
    {
      icono: Users,
      etiqueta: "Postulantes registrados",
      valor: c?.postulantes_registrados ?? i.postulantes_registrados,
      serie: serie.map((f) => f.postulantes_nuevos),
      variacion: c ? variacionCantidad(c.postulantes_nuevos, c.postulantes_nuevos_anterior) : sinComparar,
      // El número es el total; la variación, la de los registros nuevos.
      nota: c && periodo !== "todo" ? notaBase(c.postulantes_nuevos, "nuevos", periodo) : undefined,
      href: "/admin/postulantes",
    },
    {
      icono: Briefcase,
      etiqueta: "Ofertas vigentes",
      valor: c?.ofertas_vigentes ?? i.ofertas_vigentes,
      serie: serie.map((f) => f.ofertas_publicadas),
      variacion: c
        ? variacionCantidad(c.ofertas_publicadas, c.ofertas_publicadas_anterior)
        : sinComparar,
      // Las vigentes de cada fecha pasada no se pueden calcular: la variación
      // es la de las publicadas (migration_066).
      nota: c ? notaBase(c.ofertas_publicadas, "publicadas", periodo) : undefined,
      href: "/admin/ofertas?estado=activa",
    },
    {
      icono: FileText,
      etiqueta: "Postulaciones nuevas",
      valor: c?.postulaciones_nuevas ?? i.postulaciones_nuevas,
      serie: serie.map((f) => f.postulaciones),
      variacion: c
        ? variacionCantidad(c.postulaciones_nuevas, c.postulaciones_nuevas_anterior)
        : sinComparar,
      href: "/admin/postulaciones",
    },
    {
      icono: Handshake,
      etiqueta: "Contrataciones",
      valor: c?.contrataciones ?? i.contrataciones,
      serie: serie.map((f) => f.contrataciones),
      variacion: c ? variacionCantidad(c.contrataciones, c.contrataciones_anterior) : sinComparar,
      href: "/admin/postulaciones?estado=contratado",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-6 xl:grid-cols-4">
      {tarjetas.map((t) => (
        <AparecerAlScroll key={t.etiqueta}>
          <TarjetaTendencia
            icono={t.icono}
            etiqueta={t.etiqueta}
            valor={formatNumero(t.valor)}
            serie={t.serie}
            variacion={t.variacion}
            nota={t.nota}
            href={t.href}
          />
        </AparecerAlScroll>
      ))}
    </div>
  );
}

// ── Fila 2: evolución general y estado de las postulaciones ───────────────

const SERIES_EVOLUCION: SerieArea[] = [
  { clave: "postulaciones", nombre: "Postulaciones", color: COLOR_PRINCIPAL, grosor: 2.5 },
  { clave: "contrataciones", nombre: "Contrataciones", color: COLOR_CLARO, grosor: 2 },
];

function LeyendaSeries({ series }: { series: SerieArea[] }) {
  return (
    <ul
      aria-label="Referencias"
      className="flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold text-control-foreground"
    >
      {series.map((s) => (
        <li key={s.clave} className="flex items-center gap-2">
          <span aria-hidden="true" className="size-2.5 rounded-full" style={{ backgroundColor: s.color }} />
          {s.nombre}
        </li>
      ))}
    </ul>
  );
}

/** "últimos 30 días", "este año", "desde el inicio". */
function periodoEnMinuscula(periodo: Periodo): string {
  const texto = PERIODO_LABEL[periodo];
  return texto.charAt(0).toLowerCase() + texto.slice(1);
}

function EvolucionGeneral({
  filas,
  agrupacion,
  periodo,
  error,
}: {
  filas: FilaSerie[];
  agrupacion: Agrupacion;
  periodo: Periodo;
  error: boolean;
}) {
  const textos = TEXTOS_AGRUPACION[agrupacion];
  const fechas = fechasDeLaSerie(
    filas.map((f) => f.inicio),
    agrupacion,
    periodo,
  );
  const datos = fechas.map((p, k) => ({
    ...p,
    valores: { postulaciones: filas[k].postulaciones, contrataciones: filas[k].contrataciones },
  }));
  const totalPostulaciones = filas.reduce((s, f) => s + f.postulaciones, 0);
  const totalContrataciones = filas.reduce((s, f) => s + f.contrataciones, 0);
  const conDatos = !error && totalPostulaciones + totalContrataciones > 0;
  const alcance = textoAlcance(fechas, agrupacion);
  const variosAnios = new Set(fechas.map((p) => p.clave.slice(0, 4))).size > 1;
  // El más reciente gana los empates.
  const mayor =
    conDatos && totalPostulaciones > 0
      ? datos.reduce((a, b) => (b.valores.postulaciones >= a.valores.postulaciones ? b : a), datos[0])
      : undefined;
  const conclusion = mayor
    ? conclusionMayor(mayor, mayor.valores.postulaciones, agrupacion, variosAnios)
    : undefined;

  return (
    <TarjetaGrafico
      className={RADIO}
      icono={TrendingUp}
      titulo="Evolución general"
      descripcion={`Actividad en el portal: ${periodoEnMinuscula(periodo)}`}
      accion={conDatos ? <LeyendaSeries series={SERIES_EVOLUCION} /> : undefined}
      conclusion={conclusion}
      iconoConclusion={TrendingUp}
      tabla={
        conDatos
          ? {
              titulo: `Postulaciones y contrataciones por ${textos.unidad}. ${alcance}.`,
              columnas: [textos.columna, "Postulaciones", "Contrataciones"],
              filas: datos.map((p) => ({
                clave: p.clave,
                celdas: [
                  p.detalle,
                  formatNumero(p.valores.postulaciones),
                  formatNumero(p.valores.contrataciones),
                ],
              })),
            }
          : undefined
      }
    >
      {error ? (
        <ErrorGrafico />
      ) : !conDatos ? (
        <p className="text-sm text-muted-foreground">
          No hubo postulaciones ni contrataciones en el período.
        </p>
      ) : (
        <GraficoArea
          datos={datos}
          agrupacion={agrupacion}
          series={SERIES_EVOLUCION}
          rango={textoRangoCompleto(fechas)}
          resumen={`Gráfico de líneas de las postulaciones y las contrataciones por ${textos.unidad}, ${textos.cadaPunto}. ${alcance}. Postulaciones: ${formatNumero(totalPostulaciones)} en total. Contrataciones: ${formatNumero(totalContrataciones)} en total.${conclusion ? ` ${conclusion}.` : ""}`}
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

/** "3 retiradas por el postulante y 1 de una oferta que la empresa retiró". */
function textoExcluidas(e: EstadoPostulacionesPeriodo): string | undefined {
  const partes = [
    e.retiradas > 0
      ? `${formatNumero(e.retiradas)} ${e.retiradas === 1 ? "retirada" : "retiradas"} por el postulante`
      : undefined,
    e.de_ofertas_retiradas > 0
      ? `${formatNumero(e.de_ofertas_retiradas)} de ${e.de_ofertas_retiradas === 1 ? "una oferta que la empresa retiró" : "ofertas que la empresa retiró"}`
      : undefined,
  ].filter(Boolean);
  return partes.length > 0 ? `No incluye ${partes.join(" ni ")}.` : undefined;
}

function EstadoPostulaciones({
  estado,
  error,
}: {
  estado: EstadoPostulacionesPeriodo | null;
  error: boolean;
}) {
  const partes: ParteDona[] = estado
    ? [
        { clave: "revision", nombre: "En revisión", cantidad: estado.en_revision, color: COLOR_PRINCIPAL },
        { clave: "derivadas", nombre: "Derivadas", cantidad: estado.derivadas, color: COLOR_CLARO },
        { clave: "rechazadas", nombre: "Rechazadas", cantidad: estado.rechazadas, color: COLOR_GRIS },
      ]
    : [];
  const conDatos = !error && totalDe(partes) > 0;
  const excluidas = estado ? textoExcluidas(estado) : undefined;

  return (
    <TarjetaGrafico
      className={RADIO}
      icono={Inbox}
      titulo="Estado de postulaciones"
      descripcion="Las postulaciones del período, según cómo están hoy."
      tabla={conDatos ? tablaDona("Estado de las postulaciones del período", "Estado", partes) : undefined}
    >
      {error || !estado ? (
        <ErrorGrafico />
      ) : (
        <>
          <GraficoDona
            variante="resumen"
            partes={partes}
            unidad="Total"
            resumen={resumenDona("Estado de las postulaciones del período", partes)}
            vacio="No hubo postulaciones en el período."
          />
          {excluidas && <p className="mt-4 text-[13px] text-muted-foreground">{excluidas}</p>}
        </>
      )}
    </TarjetaGrafico>
  );
}

// ── Fila 3: ofertas por área, últimas postulaciones y resumen ─────────────

/** Rubros con barra propia en "Ofertas por área"; el resto va en "Otros". */
const RUBROS_CON_BARRA = 4;

function barrasPorArea(rubros: OfertasVigentesRubro[]): BarraVertical[] {
  const ranking = [...rubros]
    .map((r) => ({ clave: r.categoria_id, nombre: r.rubro, cantidad: Number(r.cantidad) }))
    .filter((r) => r.cantidad > 0)
    .sort((a, b) => b.cantidad - a.cantidad || a.nombre.localeCompare(b.nombre, "es"));
  const barras = ranking.slice(0, RUBROS_CON_BARRA);
  const resto = ranking.slice(RUBROS_CON_BARRA);
  if (resto.length > 0) {
    barras.push({ clave: "otros", nombre: "Otros", cantidad: resto.reduce((s, r) => s + r.cantidad, 0) });
  }
  return barras;
}

function OfertasPorArea({ rubros, error }: { rubros: OfertasVigentesRubro[]; error: boolean }) {
  const barras = barrasPorArea(rubros);
  const conDatos = !error && barras.length > 0;

  return (
    <TarjetaGrafico
      className={RADIO}
      icono={Briefcase}
      titulo="Ofertas por área"
      descripcion="Distribución de las ofertas vigentes"
      tabla={
        conDatos
          ? {
              titulo: "Ofertas vigentes por rubro",
              columnas: ["Rubro", "Ofertas vigentes"],
              filas: barras.map((b) => ({ clave: b.clave, celdas: [b.nombre, formatNumero(b.cantidad)] })),
            }
          : undefined
      }
    >
      {error ? (
        <ErrorGrafico />
      ) : !conDatos ? (
        <p className="text-sm text-muted-foreground">No hay ofertas vigentes.</p>
      ) : (
        <>
          <BarrasVerticales
            barras={barras}
            resumen={`Gráfico de barras de las ofertas vigentes por rubro. ${barras
              .map((b) => `${b.nombre}: ${formatNumero(b.cantidad)}`)
              .join("; ")}.`}
          />
          <p className="mt-4 text-[13px] text-muted-foreground">
            Una oferta con varios rubros cuenta en cada uno.
          </p>
        </>
      )}
    </TarjetaGrafico>
  );
}

/** El badge de la fila: los tres estados de la dona con sus colores; los demás, el de siempre. */
function BadgeUltima({ fila }: { fila: UltimaPostulacion }) {
  const visible = estadoVisiblePostulacion(fila.estado, fila.estadoEmpresa);
  switch (visible) {
    // "En revisión" junta recibidas y en revisión, como la dona.
    case "recibida":
    case "en_revision":
      return <Badge className="bg-primary text-primary-foreground">En revisión</Badge>;
    case "derivada":
      return <Badge className="bg-grafico-verde-claro text-heading">Derivada</Badge>;
    case "no_seleccionado_oficina":
    case "no_seleccionado_empresa":
      return <Badge className="bg-grafico-gris text-heading">Rechazada</Badge>;
    default: {
      const b = BADGE_ESTADO_VISIBLE[visible];
      return <Badge tono={b.tono}>{b.label}</Badge>;
    }
  }
}

function UltimasPostulaciones({
  filas,
  error,
  conFicha,
}: {
  filas: UltimaPostulacion[];
  error: boolean;
  /** En el modo de ejemplo las filas no llevan a ninguna ficha. */
  conFicha: boolean;
}) {
  return (
    <TarjetaGrafico
      className={RADIO}
      icono={Clock}
      titulo="Últimas postulaciones"
      descripcion="Las cinco más recientes."
      accion={
        <Link
          href="/admin/postulaciones"
          className="inline-flex min-h-11 items-center gap-1 rounded-[var(--radius-sm)] text-[15px] font-bold whitespace-nowrap text-primary no-underline outline-none hover:underline focus-visible:shadow-[var(--sombra-foco)]"
        >
          Ver todas
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      }
    >
      {error ? (
        <ErrorGrafico texto="No pudimos cargar las últimas postulaciones. Intentá de nuevo en unos minutos." />
      ) : filas.length === 0 ? (
        <p className="text-sm text-muted-foreground">Todavía no hay postulaciones.</p>
      ) : (
        <Tabla
          variante="incrustada"
          etiqueta="Últimas postulaciones"
          columnas="auto minmax(0,1fr) minmax(0,1fr) auto"
          encabezados={["Fecha", "Postulante", "Puesto", "Estado"]}
        >
          {filas.map((f, k) => {
            const href = conFicha && f.id ? `/admin/postulaciones/${f.id}` : undefined;
            return (
              <FilaTabla
                key={f.id ?? k}
                variante="incrustada"
                className={href ? "relative hover:bg-tabla-fila-hover" : undefined}
              >
                <CeldaTabla etiqueta="Fecha" className="order-3 text-sm @xs:order-none">
                  <span className="text-foreground tabular-nums">{formatFechaDiaMes(f.fecha)}</span>{" "}
                  <span className="text-muted-foreground tabular-nums @xs:block">{formatHora(f.fecha)}</span>
                </CeldaTabla>
                <CeldaTabla etiqueta="Postulante" className="order-1 @xs:order-none">
                  {href ? (
                    <Link
                      href={href}
                      aria-label={`${f.postulante}: ver la postulación a ${f.puesto} del ${formatFecha(f.fecha)}`}
                      className="font-bold text-heading no-underline outline-none after:absolute after:inset-0 after:rounded-[var(--radius-sm)] hover:text-primary hover:underline focus-visible:after:shadow-[var(--sombra-foco)]"
                    >
                      {f.postulante}
                    </Link>
                  ) : (
                    <span className="font-bold text-heading">{f.postulante}</span>
                  )}
                </CeldaTabla>
                <CeldaTabla etiqueta="Puesto" className="order-2 text-sm text-muted-foreground-strong @xs:order-none">
                  {f.puesto}
                </CeldaTabla>
                <CeldaTabla etiqueta="Estado" className="order-4 @xs:order-none">
                  <BadgeUltima fila={f} />
                </CeldaTabla>
              </FilaTabla>
            );
          })}
        </Tabla>
      )}
    </TarjetaGrafico>
  );
}

function FilaResumen({
  icono: Icono,
  nombre,
  valor,
  variacion,
}: {
  icono: LucideIcon;
  nombre: string;
  valor: string;
  variacion: Variacion;
}) {
  return (
    <li className="flex items-center gap-3 border-b border-tabla-borde py-3.5 first:pt-0 last:border-b-0 last:pb-0">
      <span
        aria-hidden="true"
        className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-secondary text-primary"
      >
        <Icono className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] leading-snug font-semibold text-control-foreground">{nombre}</p>
        <TextoVariacion variacion={variacion} className="mt-0.5 text-[13px]" />
      </div>
      <span className="text-[22px] leading-none font-extrabold whitespace-nowrap text-heading tabular-nums">
        {valor}
      </span>
    </li>
  );
}

function ResumenPeriodo({ i, c }: { i: FilaIndicadoresPortal; c: IndicadoresComparados | null }) {
  const sinComparar: Variacion = { tipo: "sin-datos" };
  const tasa = c?.tasa_contratacion ?? null;

  return (
    <TarjetaGrafico
      className={RADIO}
      icono={ChartColumn}
      titulo="Resumen del período"
      descripcion="Comparado con el período anterior de la misma duración."
    >
      <ul className="flex flex-col">
        <FilaResumen
          icono={Send}
          nombre="Postulaciones derivadas"
          valor={formatNumero(c?.derivaciones ?? i.derivaciones_empresas)}
          variacion={c ? variacionCantidad(c.derivaciones, c.derivaciones_anterior) : sinComparar}
        />
        <FilaResumen
          icono={Handshake}
          nombre="Contrataciones"
          valor={formatNumero(c?.contrataciones ?? i.contrataciones)}
          variacion={c ? variacionCantidad(c.contrataciones, c.contrataciones_anterior) : sinComparar}
        />
        <FilaResumen
          icono={Percent}
          nombre="Tasa de contratación"
          valor={tasa === null ? "—" : `${formatDecimal(tasa)} %`}
          variacion={
            c
              ? variacionTasa(c.tasa_contratacion, c.tasa_contratacion_anterior, c.postulaciones_nuevas_anterior !== null)
              : sinComparar
          }
        />
      </ul>
      <p className="mt-4 text-[13px] text-muted-foreground">
        Tasa: contrataciones sobre postulaciones nuevas del período.
      </p>
    </TarjetaGrafico>
  );
}

// ── Debajo: los indicadores de antes ──────────────────────────────────────

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
      className={RADIO}
      icono={Tags}
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
      className={RADIO}
      icono={ClipboardCheck}
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
      className={RADIO}
      icono={Building2}
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

function ProcesoOficina({ i }: { i: FilaIndicadoresPortal }) {
  return (
    <section
      aria-labelledby="titulo-proceso"
      className="tarjeta rounded-[var(--radius-indicador)] px-4 py-[18px] sm:p-6"
    >
      <h2
        id="titulo-proceso"
        className="flex items-center gap-2 text-lg leading-snug font-extrabold text-heading"
      >
        <ListChecks aria-hidden="true" className="size-5 shrink-0 text-primary" />
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

function ErrorGrafico({
  texto = "No pudimos cargar este gráfico. Intentá de nuevo en unos minutos.",
}: {
  texto?: string;
}) {
  return (
    <p role="alert" className="text-sm text-danger">
      {texto}
    </p>
  );
}
