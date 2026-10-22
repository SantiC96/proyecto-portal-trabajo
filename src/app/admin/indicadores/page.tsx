import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Suspense } from "react";
import Link from "next/link";
import { BookOpen, Building2, ChartColumn, LayoutDashboard, Route } from "lucide-react";
import { requerirRolPagina } from "@/lib/auth";
import { logError } from "@/lib/logger";
import { obtenerIndicadores } from "@/lib/admin/indicadores";
import { leerPeriodo, PERIODO_LABEL, type Periodo } from "@/lib/indicadores-periodo";
import type { FilaIndicadoresPortal } from "@/types/db";
import { EstadoVacio, ErrorListado } from "@/components/ui/estado-listado";
import {
  GrupoIndicadores,
  formatDecimal,
  formatNumero,
  type Indicador,
} from "@/components/indicadores/grupo-indicadores";
import { SelectorPeriodo } from "@/components/indicadores/selector-periodo";
import { TituloBloque } from "@/components/indicadores/titulo-bloque";
import { GraficoPorMes, GraficoPorRubro } from "./graficos";
import { EsqueletoIndicadores } from "./esqueleto-indicadores";
import { formatMesAnio } from "@/lib/fechas";
import { BotonVolver } from "@/components/ui/boton-volver";

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
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <BotonVolver href="/admin">Volver al panel</BotonVolver>

      <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        Indicadores
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Datos del funcionamiento del portal, calculados en el momento.
      </p>

      <SelectorPeriodo ruta={RUTA} periodo={periodo} />

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
  const { indicadores, porMes, porRubro } = await obtenerIndicadores(periodo);

  if (indicadores.error || !indicadores.data) {
    const ref = logError("indicadores_portal", indicadores.error ?? "sin datos", { periodo });
    return (
      <ErrorListado
        className="mt-8"
        mensaje="No pudimos cargar los indicadores. Intentá de nuevo en unos minutos."
        refError={ref}
      />
    );
  }

  const i = indicadores.data;
  const etiquetaPeriodo = PERIODO_LABEL[periodo].toLowerCase();
  const conActividad = hayActividad(i);

  const portal: Indicador[] = [
    {
      etiqueta: "Postulantes registrados",
      valor: formatNumero(i.postulantes_registrados),
      href: "/admin/postulantes",
    },
    {
      etiqueta: "Ofertas activas y vigentes",
      valor: formatNumero(i.ofertas_vigentes),
      href: "/admin/ofertas?estado=activa",
    },
  ];

  const empresas: Indicador[] = [
    {
      etiqueta: "Pendientes de revisión",
      valor: formatNumero(i.empresas_pendientes),
      href: "/admin/empresas?estado=pendiente",
    },
    {
      etiqueta: "Aprobadas",
      valor: formatNumero(i.empresas_aprobadas),
      href: "/admin/empresas?estado=aprobada",
    },
    {
      etiqueta: "Rechazadas",
      valor: formatNumero(i.empresas_rechazadas),
      href: "/admin/empresas?estado=rechazada",
    },
  ];

  const seleccion: Indicador[] = [
    {
      etiqueta: "Postulaciones nuevas",
      valor: formatNumero(i.postulaciones_nuevas),
      href: "/admin/postulaciones",
    },
    {
      etiqueta: "Derivaciones a empresas",
      valor: formatNumero(i.derivaciones_empresas),
      href: "/admin/postulaciones?estado=derivada",
    },
    {
      etiqueta: "Contrataciones",
      valor: formatNumero(i.contrataciones),
      href: "/admin/postulaciones?estado=contratado",
    },
    {
      etiqueta: "No seleccionados por la empresa",
      valor: formatNumero(i.rechazos_empresas),
      href: "/admin/postulaciones?estado=rechazada_municipalidad",
    },
    {
      etiqueta: "No seleccionados por la oficina",
      valor: formatNumero(i.no_seleccionados_oficina),
      href: "/admin/postulaciones?estado=rechazada_municipalidad",
    },
    {
      etiqueta: "Pre-entrevistas realizadas",
      valor: formatNumero(i.pre_entrevistas_realizadas),
    },
    {
      etiqueta: "Tasa de contratación",
      valor: i.tasa_contratacion === null ? "—" : `${formatDecimal(i.tasa_contratacion)} %`,
      detalle:
        i.tasa_contratacion === null
          ? "Sin resultados de empresas en el período"
          : "Contrataciones sobre derivaciones con resultado",
    },
    {
      etiqueta: "Días hasta la derivación",
      valor:
        i.dias_promedio_derivacion === null ? "—" : formatDecimal(i.dias_promedio_derivacion),
      detalle:
        i.dias_promedio_derivacion === null
          ? "Sin derivaciones en el período"
          : "Promedio desde la postulación",
    },
  ];

  const cursos: Indicador[] = [
    {
      etiqueta: "Cursos asignados",
      valor: formatNumero(i.cursos_asignados),
      href: "/admin/cursos",
    },
    {
      etiqueta: "Cursos completados",
      valor: formatNumero(i.cursos_completados),
      href: "/admin/cursos/completados",
    },
  ];

  if (porMes.error) logError("postulaciones_por_mes", porMes.error);
  if (porRubro.error) logError("postulaciones_por_rubro", porRubro.error, { periodo });

  const meses = porMes.data;
  const hayPostulacionesEnElAnio = meses.some((m) => m.cantidad > 0);

  return (
    <div className="mt-8 flex flex-col gap-8">
      <div>
        <TituloBloque titulo="Situación actual" descripcion="No depende del período elegido." />
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <GrupoIndicadores titulo="Portal" icono={LayoutDashboard} indicadores={portal} />
          <GrupoIndicadores titulo="Empresas" icono={Building2} indicadores={empresas} />
        </div>
      </div>

      <div>
        <TituloBloque
          titulo={`En el período: ${etiquetaPeriodo}`}
          descripcion="Cada evento cuenta en la fecha en que ocurrió."
        />
        {conActividad ? (
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <GrupoIndicadores
              titulo="Proceso de selección"
              icono={Route}
              indicadores={seleccion}
            />
            <div className="flex flex-col gap-4">
              <GrupoIndicadores titulo="Cursos" icono={BookOpen} indicadores={cursos} />
              <TarjetaGrafico
                titulo="Postulaciones por rubro"
                descripcion="Según la categoría de la oferta. Una postulación cuenta en cada rubro de su oferta."
              >
                {porRubro.error ? (
                  <ErrorGrafico />
                ) : porRubro.data.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No hubo postulaciones en el período.
                  </p>
                ) : (
                  <GraficoPorRubro rubros={porRubro.data} />
                )}
              </TarjetaGrafico>
            </div>
          </div>
        ) : (
          <EstadoVacio
            tipo="sin-registros"
            className="mt-4"
            icono={ChartColumn}
            titulo="No hubo actividad en este período"
            descripcion="No se registraron postulaciones, derivaciones ni cursos. Probá con un período más largo."
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

      <TarjetaGrafico
        titulo="Postulaciones por mes"
        descripcion={
          meses.length > 0
            ? `Últimos 12 meses, de ${formatMesAnio(meses[0].mes)} a ${formatMesAnio(meses[meses.length - 1].mes)}. No depende del período elegido.`
            : "Últimos 12 meses."
        }
      >
        {porMes.error ? (
          <ErrorGrafico />
        ) : !hayPostulacionesEnElAnio ? (
          <p className="text-sm text-muted-foreground">
            No hubo postulaciones en los últimos 12 meses.
          </p>
        ) : (
          <GraficoPorMes meses={meses} />
        )}
      </TarjetaGrafico>
    </div>
  );
}

function TarjetaGrafico({
  titulo,
  descripcion,
  children,
}: {
  titulo: string;
  descripcion: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-label={titulo}
      className="rounded-[var(--radius-lg)] border border-border bg-surface p-4 shadow-xs sm:p-5"
    >
      <h3 className="text-base font-semibold text-foreground">{titulo}</h3>
      <p className="mt-0.5 text-sm text-muted-foreground">{descripcion}</p>
      <div className="mt-4">{children}</div>
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
