import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { CursoForm } from "../curso-form";
import { CursoAcciones } from "../curso-acciones";
import { formatFechaCorta } from "@/lib/fechas";
import { logError } from "@/lib/logger";
import { consultarPagina, hrefConParams, leerPagina, type ParamsUrl } from "@/lib/paginacion";
import { AvisoUrl } from "@/components/ui/aviso-url";
import { Paginacion } from "@/components/ui/paginacion";
import { ErrorListado, EstadoVacio } from "@/components/ui/estado-listado";
import { EsqueletoLista } from "@/components/ui/esqueleto";
import { EstadoCursoBadge } from "@/components/cursos/estado-curso-badge";
import {
  ESTADO_CURSO_LABEL,
  ESTADOS_ASIGNACION_CURSO,
  conEstadoCurso,
  esEstadoCurso,
  type EstadoAsignacionCurso,
} from "@/lib/cursos";
import type { Tabla } from "@/types/db";
import { requerirRolPagina } from "@/lib/auth";
import { BotonVolver } from "@/components/ui/boton-volver";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Detalle del curso | Panel municipal | Portal de Empleo Funes",
};

export default async function CursoDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ pagina?: string; estado?: string }>;
}) {
  await requerirRolPagina("municipalidad");
  const { id: cursoId } = await params;
  const sp = await searchParams;
  const pagina = leerPagina(sp.pagina);
  const estadoFiltro = esEstadoCurso(sp.estado) ? sp.estado : null;

  const supabase = await createSupabaseServerClient();

  const [cursoRes, ...conteosRes] = await Promise.all([
    supabase
      .from("cursos")
      .select("id, nombre, descripcion, link, indicaciones, activo, created_at")
      .eq("id", cursoId)
      .single(),
    ...ESTADOS_ASIGNACION_CURSO.map((estado) =>
      supabase
        .from("asignaciones_curso")
        .select("id", { count: "exact", head: true })
        .eq("curso_id", cursoId)
        .eq("estado", estado)
    ),
  ]);

  if (!cursoRes.data) notFound();

  const curso = cursoRes.data;
  const conteoPorEstado: Record<EstadoAsignacionCurso, number> = {
    asignado: 0,
    en_curso: 0,
    completado: 0,
    abandonado: 0,
  };
  ESTADOS_ASIGNACION_CURSO.forEach((estado, i) => {
    const res = conteosRes[i];
    if (res.error) logError("admin_curso_conteo_asignaciones", res.error, { estado });
    conteoPorEstado[estado] = res.count ?? 0;
  });
  const totalAsignaciones = Object.values(conteoPorEstado).reduce((a, b) => a + b, 0);
  const tieneAsignaciones = totalAsignaciones > 0;
  // La oficina ya no puede marcar cursos como abandonados (migration_038):
  // el filtro solo aparece si quedan asignaciones históricas en ese estado.
  const estadosFiltro: (EstadoAsignacionCurso | null)[] = [
    null,
    ...ESTADOS_ASIGNACION_CURSO.filter(
      (estado) => estado !== "abandonado" || conteoPorEstado.abandonado > 0
    ),
  ];
  const rutaCurso = `/admin/cursos/${curso.id}`;

  return (
    <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <Suspense>
        <AvisoUrl />
      </Suspense>
      <BotonVolver href="/admin/cursos">Volver a cursos</BotonVolver>

      <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        {curso.nombre}
      </h1>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Editar */}
        <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-5">
          <h2 className="mb-4 font-semibold text-foreground">Editar</h2>
          <CursoForm
            modo="editar"
            cursoId={curso.id}
            inicial={{
              nombre: curso.nombre,
              descripcion: curso.descripcion,
              link: curso.link,
              indicaciones: curso.indicaciones,
            }}
          />
        </div>

        {/* Estado y acciones */}
        <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-5 space-y-4">
          <div>
            <h2 className="font-semibold text-foreground">Estado</h2>
            <div className="mt-2">
              <Badge tono={curso.activo ? "success" : "neutral"} estado>
                {curso.activo ? "Activo" : "Inactivo"}
              </Badge>
            </div>
          </div>

          <CursoAcciones
            cursoId={curso.id}
            activo={curso.activo}
            tieneAsignaciones={tieneAsignaciones}
          />

          {tieneAsignaciones && (
            <p className="text-xs text-muted-foreground">
              No se puede eliminar un curso con asignaciones.
            </p>
          )}
        </div>
      </div>

      {/* Postulantes asignados */}
      <div
        id="asignados"
        className="mt-8 scroll-mt-20 rounded-[var(--radius-lg)] border border-border bg-surface p-5"
      >
        <h2 className="font-semibold text-foreground">
          Postulantes asignados ({totalAsignaciones})
        </h2>

        {tieneAsignaciones && (
          <nav aria-label="Filtrar por estado" className="mt-4 flex flex-wrap gap-2">
            {estadosFiltro.map(
              (estado) => {
                const activo = estado === estadoFiltro;
                const cantidad = estado ? conteoPorEstado[estado] : totalAsignaciones;
                return (
                  <Link
                    key={estado ?? "todos"}
                    href={hrefConParams(rutaCurso, sp, { estado, pagina: null }, "asignados")}
                    scroll={false}
                    aria-current={activo ? "page" : undefined}
                    className={
                      activo
                        ? "inline-flex min-h-11 items-center gap-1.5 rounded-full bg-primary px-3 text-sm font-medium text-primary-foreground sm:min-h-9"
                        : "inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border bg-white px-3 text-sm text-muted-foreground-strong transition-colors hover:text-foreground sm:min-h-9"
                    }
                  >
                    {estado ? ESTADO_CURSO_LABEL[estado] : "Todos"}
                    <span className="text-xs opacity-80">{cantidad}</span>
                  </Link>
                );
              }
            )}
          </nav>
        )}

        <Suspense
          key={JSON.stringify({ pagina, estadoFiltro })}
          fallback={<EsqueletoLista filas={3} className="mt-4" />}
        >
          <ListadoAsignados
            cursoId={curso.id}
            estado={estadoFiltro}
            pagina={pagina}
            searchParams={sp}
          />
        </Suspense>
      </div>
    </section>
  );
}

async function ListadoAsignados({
  cursoId,
  estado,
  pagina,
  searchParams,
}: {
  cursoId: string;
  estado: EstadoAsignacionCurso | null;
  pagina: number;
  searchParams: ParamsUrl;
}) {
  const supabase = await createSupabaseServerClient();

  const resultado = await consultarPagina(pagina, (desde, hasta) => {
    let query = supabase
      .from("asignaciones_curso")
      .select(
        "id, created_at, nota, estado, iniciado_en, completado_en, abandonado_en, postulantes!postulante_id(id, usuarios!usuario_id(nombre, apellido))",
        { count: "exact" }
      )
      .eq("curso_id", cursoId);
    if (estado) query = query.eq("estado", estado);
    return query
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(desde, hasta);
  });

  if (!resultado.ok) {
    const ref = logError("admin_curso_asignados", resultado.error);
    return (
      <ErrorListado
        className="mt-4"
        mensaje="No pudimos cargar los postulantes asignados."
        refError={ref}
      />
    );
  }

  const asignaciones = conEstadoCurso(resultado.filas);

  if (asignaciones.length === 0) {
    return estado ? (
      <EstadoVacio
        tipo="sin-resultados"
        className="mt-3"
        titulo={`No hay asignaciones en estado «${ESTADO_CURSO_LABEL[estado]}»`}
        descripcion="Probá con otro estado o mirá todas las asignaciones."
        hrefLimpiar={hrefConParams(`/admin/cursos/${cursoId}`, searchParams, { estado: null, pagina: null }, "asignados")}
        textoLimpiar="Ver todas"
      />
    ) : (
      <EstadoVacio
        tipo="sin-registros"
        className="mt-3"
        titulo="Todavía no se asignó este curso a ningún postulante"
        descripcion="Se asigna desde la ficha de un postulante o desde el listado de postulantes."
      />
    );
  }

  return (
    <>
      {/* Tabla md+ */}
      <div className="mt-4 hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="pb-2 pr-4 font-medium text-muted-foreground">Postulante</th>
              <th className="pb-2 pr-4 font-medium text-muted-foreground">Estado</th>
              <th className="pb-2 pr-4 font-medium text-muted-foreground">Fechas</th>
              <th className="pb-2 font-medium text-muted-foreground">Nota interna</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {asignaciones.map((a) => {
              const p = a.postulantes;
              const u = p?.usuarios;
              const nombre = u ? `${u.nombre} ${u.apellido}` : "Postulante eliminado";
              return (
                <tr key={a.id}>
                  <td className="py-3 pr-4 font-medium text-foreground">
                    {p ? (
                      <Link
                        href={`/admin/postulantes/${p.id}`}
                        className="text-primary hover:underline"
                      >
                        {nombre}
                      </Link>
                    ) : (
                      nombre
                    )}
                  </td>
                  <td className="py-3 pr-4">
                    <EstadoCursoBadge estado={a.estado} />
                  </td>
                  <td className="py-3 pr-4 text-xs text-muted-foreground">
                    <FechasAsignacion asignacion={a} />
                  </td>
                  <td className="py-3 text-xs text-muted-foreground">{a.nota ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Cards mobile */}
      <div className="mt-4 space-y-3 md:hidden">
        {asignaciones.map((a) => {
          const p = a.postulantes;
          const u = p?.usuarios;
          const nombre = u ? `${u.nombre} ${u.apellido}` : "Postulante eliminado";
          return (
            <div
              key={a.id}
              className="rounded-[var(--radius-md)] border border-border p-3 space-y-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-foreground">
                  {p ? (
                    <Link
                      href={`/admin/postulantes/${p.id}`}
                      className="text-primary hover:underline"
                    >
                      {nombre}
                    </Link>
                  ) : (
                    nombre
                  )}
                </p>
                <EstadoCursoBadge estado={a.estado} />
              </div>
              <div className="text-xs text-muted-foreground">
                <FechasAsignacion asignacion={a} />
              </div>
              {a.nota && <p className="text-xs text-muted-foreground">{a.nota}</p>}
            </div>
          );
        })}
      </div>
      <Paginacion
        className="mt-4"
        ruta={`/admin/cursos/${cursoId}`}
        searchParams={searchParams}
        pagina={resultado.pagina}
        total={resultado.total}
        ancla="asignados"
      />
    </>
  );
}

function FechasAsignacion({
  asignacion: a,
}: {
  asignacion: Pick<
    Tabla<"asignaciones_curso">,
    "created_at" | "iniciado_en" | "completado_en" | "abandonado_en"
  > & { estado: EstadoAsignacionCurso };
}) {
  return (
    <ul className="space-y-0.5">
      <li>Asignado: {formatFechaCorta(a.created_at)}</li>
      {a.iniciado_en && <li>Empezado: {formatFechaCorta(a.iniciado_en)}</li>}
      {a.completado_en && <li>Completado: {formatFechaCorta(a.completado_en)}</li>}
      {a.estado === "abandonado" && a.abandonado_en && (
        <li>Abandonado: {formatFechaCorta(a.abandonado_en)}</li>
      )}
    </ul>
  );
}
