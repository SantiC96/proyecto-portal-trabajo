import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Briefcase, ChartColumn, ChevronRight, Plus, UserCheck, Users } from "lucide-react";
import { requerirEmpresaPagina } from "@/lib/auth";
import { logError } from "@/lib/logger";
import { obtenerIndicadoresEmpresa } from "@/lib/empresa/indicadores";
import { leerPeriodo, PERIODO_LABEL, type Periodo } from "@/lib/indicadores-periodo";
import { estadoVencimiento } from "@/lib/ofertas-vencimiento";
import {
  ESTADO_OFERTA_EMPRESA_LABEL,
  ESTADO_OFERTA_EMPRESA_STYLE,
  type EstadoOfertaEmpresa,
} from "@/lib/oferta-estados";
import { formatFechaCorta } from "@/lib/fechas";
import { cn } from "@/lib/utils";
import type { FilaIndicadoresEmpresa, FilaIndicadoresPorOfertaEmpresa } from "@/types/db";
import { EstadoVacio, ErrorListado } from "@/components/ui/estado-listado";
import {
  GrupoIndicadores,
  formatDecimal,
  formatNumero,
  type Indicador,
} from "@/components/indicadores/grupo-indicadores";
import { SelectorPeriodo } from "@/components/indicadores/selector-periodo";
import { TituloBloque } from "@/components/indicadores/titulo-bloque";
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
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/empresa" className="hover:text-foreground">
          Panel
        </Link>
        <span>/</span>
        <span className="text-foreground">Indicadores</span>
      </div>

      <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        Indicadores
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Datos de tus ofertas y de los candidatos que te derivó la Oficina de Empleo, calculados
        en el momento.
      </p>

      <SelectorPeriodo ruta={RUTA} periodo={periodo} />

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
        className="mt-8"
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
        className="mt-8"
        icono={Briefcase}
        titulo="Todavía no publicaste ofertas"
        descripcion="Cuando publiques una oferta y la oficina te derive candidatos, vas a ver acá cómo avanza cada búsqueda."
        accion={
          <Link
            href="/empresa/ofertas/nueva"
            className="btn-primario inline-flex h-11 items-center gap-2 px-4 text-sm"
          >
            <Plus className="h-4 w-4" />
            Publicar mi primera oferta
          </Link>
        }
      />
    );
  }

  const etiquetaPeriodo = PERIODO_LABEL[periodo].toLowerCase();

  const ofertas: Indicador[] = [
    { etiqueta: "Publicadas y vigentes", valor: formatNumero(i.ofertas_vigentes) },
    { etiqueta: "Pendientes de revisión", valor: formatNumero(i.ofertas_pendientes) },
    { etiqueta: "Vencidas", valor: formatNumero(i.ofertas_vencidas) },
    { etiqueta: "Cerradas", valor: formatNumero(i.ofertas_cerradas) },
    { etiqueta: "Rechazadas", valor: formatNumero(i.ofertas_rechazadas) },
  ];

  const vacantes: Indicador[] = [
    {
      etiqueta: "Vacantes",
      valor: formatNumero(i.vacantes_totales),
      detalle: "De las ofertas publicadas",
    },
    {
      etiqueta: "Vacantes cubiertas",
      valor: formatNumero(i.vacantes_cubiertas),
      detalle:
        i.vacantes_totales > 0
          ? `${formatDecimal((i.vacantes_cubiertas * 100) / i.vacantes_totales)} % del total`
          : "Sin ofertas publicadas",
    },
  ];

  const candidatos: Indicador[] = [
    { etiqueta: "Candidatos derivados", valor: formatNumero(i.candidatos_derivados) },
    {
      etiqueta: "Entrevistas coordinadas",
      valor: formatNumero(i.entrevistas_coordinadas),
      detalle: "Por fecha de la entrevista, incluye las próximas",
    },
    { etiqueta: "Seleccionados", valor: formatNumero(i.seleccionados) },
    { etiqueta: "No seleccionados", valor: formatNumero(i.no_seleccionados) },
    {
      etiqueta: "Días hasta la selección",
      valor:
        i.dias_promedio_contratacion === null ? "—" : formatDecimal(i.dias_promedio_contratacion),
      detalle:
        i.dias_promedio_contratacion === null
          ? "Sin seleccionados en el período"
          : "Promedio desde la derivación",
    },
  ];

  const refPorOferta = porOferta.error
    ? logError("indicadores_por_oferta_empresa", porOferta.error, { periodo })
    : undefined;

  return (
    <div className="mt-8 flex flex-col gap-8">
      <div>
        <TituloBloque titulo="Situación actual" descripcion="No depende del período elegido." />
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <GrupoIndicadores titulo="Ofertas" icono={Briefcase} indicadores={ofertas} />
          <GrupoIndicadores titulo="Vacantes" icono={UserCheck} indicadores={vacantes} />
        </div>
      </div>

      <div>
        <TituloBloque
          titulo={`En el período: ${etiquetaPeriodo}`}
          descripcion="Solo candidatos que te derivó la oficina. Cada evento cuenta en la fecha en que ocurrió."
        />
        {hayActividad(i) ? (
          <div className="mt-4">
            <GrupoIndicadores
              titulo="Candidatos"
              icono={Users}
              indicadores={candidatos}
              columnas="sm:grid-cols-3 lg:grid-cols-5"
            />
          </div>
        ) : (
          <EstadoVacio
            tipo="sin-registros"
            className="mt-4"
            icono={ChartColumn}
            titulo="No hubo actividad en este período"
            descripcion="No se registraron derivaciones, entrevistas ni resultados. Probá con un período más largo."
            accion={
              periodo !== "todo" ? (
                <Link
                  href={`${RUTA}?periodo=todo`}
                  className="btn-secundario inline-flex min-h-11 items-center px-4 text-sm font-medium"
                >
                  Ver desde el inicio
                </Link>
              ) : undefined
            }
          />
        )}
      </div>

      <div>
        <TituloBloque
          titulo="Por oferta"
          descripcion="Derivados, entrevistas y seleccionados del período. Las vacantes cubiertas son desde la publicación."
        />
        {porOferta.error ? (
          <ErrorListado
            className="mt-4"
            mensaje="No pudimos cargar el detalle por oferta. Intentá de nuevo en unos minutos."
            refError={refPorOferta}
          />
        ) : (
          <ListaPorOferta ofertas={porOferta.data} />
        )}
      </div>
    </div>
  );
}

function estadoVisible(o: FilaIndicadoresPorOfertaEmpresa): EstadoOfertaEmpresa {
  return estadoVencimiento(o.estado, o.vence_en).vencida ? "vencida" : o.estado;
}

function BadgeEstado({ estado }: { estado: EstadoOfertaEmpresa }) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium",
        ESTADO_OFERTA_EMPRESA_STYLE[estado],
      )}
    >
      {ESTADO_OFERTA_EMPRESA_LABEL[estado]}
    </span>
  );
}

function textoCobertura(o: FilaIndicadoresPorOfertaEmpresa): string {
  return o.vacantes === null
    ? "—"
    : `${formatNumero(o.cubiertas)} de ${formatNumero(o.vacantes)}`;
}

/** El vencimiento solo tiene sentido mientras la oferta está publicada. */
function textoVence(o: FilaIndicadoresPorOfertaEmpresa): string {
  return o.estado === "activa" && o.vence_en ? formatFechaCorta(o.vence_en) : "—";
}

function ListaPorOferta({ ofertas }: { ofertas: FilaIndicadoresPorOfertaEmpresa[] }) {
  return (
    <>
      <div className="mt-4 hidden overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface shadow-xs lg:block">
        <table className="w-full text-sm">
          <thead className="bg-surface-tinted">
            <tr className="text-left">
              <th scope="col" className="px-4 py-3 font-medium text-muted-foreground">Oferta</th>
              <th scope="col" className="px-4 py-3 font-medium text-muted-foreground">Estado</th>
              <th scope="col" className="px-4 py-3 text-right font-medium text-muted-foreground">
                Vacantes cubiertas
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium text-muted-foreground">Derivados</th>
              <th scope="col" className="px-4 py-3 text-right font-medium text-muted-foreground">Entrevistas</th>
              <th scope="col" className="px-4 py-3 text-right font-medium text-muted-foreground">Seleccionados</th>
              <th scope="col" className="px-4 py-3 font-medium text-muted-foreground">Vence</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {ofertas.map((o) => (
              <tr key={o.oferta_id} className="align-top">
                <td className="px-4 py-3">
                  <Link
                    href={`/empresa/ofertas/${o.oferta_id}`}
                    className="font-medium text-primary underline-offset-2 hover:underline"
                  >
                    {o.titulo}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <BadgeEstado estado={estadoVisible(o)} />
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-foreground">{textoCobertura(o)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-foreground">{formatNumero(o.derivados)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-foreground">{formatNumero(o.entrevistas)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-foreground">{formatNumero(o.seleccionados)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{textoVence(o)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="mt-4 flex flex-col gap-3 lg:hidden">
        {ofertas.map((o) => (
          <li key={o.oferta_id}>
            <Link
              href={`/empresa/ofertas/${o.oferta_id}`}
              className="relative block rounded-[var(--radius-lg)] border border-border bg-surface p-4 pr-10 shadow-xs transition-colors hover:bg-surface-tinted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="min-w-0 break-words font-semibold text-foreground">{o.titulo}</p>
                <BadgeEstado estado={estadoVisible(o)} />
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
                <DatoTarjeta etiqueta="Vacantes cubiertas" valor={textoCobertura(o)} />
                <DatoTarjeta etiqueta="Derivados" valor={formatNumero(o.derivados)} />
                <DatoTarjeta etiqueta="Entrevistas" valor={formatNumero(o.entrevistas)} />
                <DatoTarjeta etiqueta="Seleccionados" valor={formatNumero(o.seleccionados)} />
                <DatoTarjeta etiqueta="Vence" valor={textoVence(o)} />
              </dl>
              <ChevronRight
                className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-icon"
                aria-hidden="true"
              />
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

function DatoTarjeta({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{etiqueta}</dt>
      <dd className="font-medium tabular-nums text-foreground">{valor}</dd>
    </div>
  );
}
