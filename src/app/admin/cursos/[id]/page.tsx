import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Lock, StickyNote, Users } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { CursoForm } from "../curso-form";
import { CursoAcciones } from "../curso-acciones";
import { formatFechaCorta } from "@/lib/fechas";
import { logError } from "@/lib/logger";
import { inicialesDePersona } from "@/lib/iniciales";
import { consultarPagina, hrefConParams, leerPagina, type ParamsUrl } from "@/lib/paginacion";
import { cn } from "@/lib/utils";
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
import type { Tabla as FilaDb } from "@/types/db";
import { requerirRolPagina } from "@/lib/auth";
import { BotonVolver } from "@/components/ui/boton-volver";
import { Badge, BadgeBanda } from "@/components/ui/badge";
import { EncabezadoPagina } from "@/components/ui/encabezado-pagina";
import { PastillaFiltro } from "@/components/ui/pastilla-filtro";
import { TituloBloque } from "@/components/ui/titulo-bloque";
import { CeldaPersona, FilaTabla, Tabla } from "@/components/ui/tabla";

export const metadata: Metadata = {
  title: "Detalle del curso | Panel municipal | Portal de Empleo Funes",
};

const TARJETA = "tarjeta tarjeta-panel flex min-w-0 flex-col gap-4";
const TITULO_TARJETA = "text-lg font-extrabold text-heading sm:text-xl";

const FILETE_ESTADO_CURSO: Record<EstadoAsignacionCurso, string> = {
  asignado: "before:bg-violet",
  en_curso: "before:bg-violet",
  completado: "before:bg-success",
  abandonado: "before:bg-neutral",
};

const COLUMNAS_ASIGNADOS = "minmax(0,1.3fr) 8.5rem minmax(0,1fr) minmax(0,1.4fr)";

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
  // el estado solo aparece si quedan asignaciones históricas en él.
  const estadosVisibles = ESTADOS_ASIGNACION_CURSO.filter(
    (estado) => estado !== "abandonado" || conteoPorEstado.abandonado > 0
  );
  const estadosFiltro: (EstadoAsignacionCurso | null)[] = [null, ...estadosVisibles];
  const rutaCurso = `/admin/cursos/${curso.id}`;

  return (
    <section className="flex w-full flex-col gap-6">
      <Suspense>
        <AvisoUrl />
      </Suspense>
      <BotonVolver href="/admin/cursos" destacado />

      <EncabezadoPagina
        banda
        botonesBlancos
        className="-mt-2"
        titulo={curso.nombre}
        junto={
          <BadgeBanda tono={curso.activo ? "success" : "neutral"}>
            {curso.activo ? "Activo" : "Inactivo"}
          </BadgeBanda>
        }
        bajada={`${totalAsignaciones} ${totalAsignaciones === 1 ? "postulante asignado" : "postulantes asignados"} · ${conteoPorEstado.completado} ${conteoPorEstado.completado === 1 ? "completado" : "completados"}`}
      />

      {/* Estado y Asignaciones lado a lado con la misma altura; debajo, los
          datos del curso a todo el ancho (miden lo que su contenido). */}
      <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2 md:gap-5">
        <section aria-labelledby="estado-curso" className={TARJETA}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="estado-curso" className={TITULO_TARJETA}>
              Estado
            </h2>
            <Badge tono={curso.activo ? "success" : "neutral"} estado>
              {curso.activo ? "Activo" : "Inactivo"}
            </Badge>
          </div>
          <p className="text-[15px] leading-normal text-muted-foreground-strong">
            {curso.activo
              ? "Si lo desactivás, no se puede asignar a postulantes nuevos. Las asignaciones que ya tiene no cambian."
              : "Está inactivo: no se puede asignar a postulantes nuevos. Activalo para volver a asignarlo."}
          </p>
          <div className="mt-auto flex flex-col gap-2">
            <CursoAcciones
              cursoId={curso.id}
              activo={curso.activo}
              tieneAsignaciones={tieneAsignaciones}
            />
            {tieneAsignaciones && (
              <p className="flex items-start gap-2 text-sm leading-snug text-muted-foreground-strong">
                <Lock aria-hidden="true" className="mt-px size-4 shrink-0" />
                No se puede eliminar un curso con asignaciones.
              </p>
            )}
          </div>
        </section>

        <section aria-labelledby="asignaciones-curso" className={TARJETA}>
          <h2 id="asignaciones-curso" className={TITULO_TARJETA}>
            Asignaciones
          </h2>
          {/* flex-1 + auto-rows-fr: los cuadros crecen hasta el alto de "Estado". */}
          <dl
            className={cn(
              "grid flex-1 auto-rows-fr gap-3",
              estadosVisibles.length === 4 ? "grid-cols-2" : "grid-cols-3",
            )}
          >
            {estadosVisibles.map((estado) => {
              const valor = conteoPorEstado[estado];
              return (
                <div
                  key={estado}
                  className={cn(
                    "flex min-w-0 flex-col-reverse items-center justify-center gap-1 rounded-[14px] px-2 py-3 text-center",
                    valor > 0 ? "bg-surface-tinted text-primary" : "bg-secondary text-heading",
                  )}
                >
                  <dt className="text-[13px] font-semibold text-muted-foreground-strong">
                    {ESTADO_CURSO_LABEL[estado]}
                  </dt>
                  <dd className="text-[26px] leading-none font-extrabold tabular-nums">{valor}</dd>
                </div>
              );
            })}
          </dl>
        </section>
      </div>

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

      <section id="asignados" aria-labelledby="titulo-asignados" className="flex scroll-mt-20 flex-col gap-4">
        <TituloBloque
          id="titulo-asignados"
          titulo={`Postulantes asignados (${totalAsignaciones})`}
          icono={Users}
        />

        {tieneAsignaciones && (
          <nav aria-label="Filtrar por estado">
            <div className="sin-barra-scroll -mx-4 -my-1 flex gap-2 overflow-x-auto px-4 py-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
              {estadosFiltro.map((estado) => (
                <PastillaFiltro
                  key={estado ?? "todos"}
                  href={hrefConParams(rutaCurso, sp, { estado, pagina: null }, "asignados")}
                  activa={estado === estadoFiltro}
                  cantidad={estado ? conteoPorEstado[estado] : totalAsignaciones}
                >
                  {estado ? ESTADO_CURSO_LABEL[estado] : "Todos"}
                </PastillaFiltro>
              ))}
            </div>
          </nav>
        )}

        <Suspense
          key={JSON.stringify({ pagina, estadoFiltro })}
          fallback={<EsqueletoLista filas={3} />}
        >
          <ListadoAsignados
            cursoId={curso.id}
            estado={estadoFiltro}
            pagina={pagina}
            searchParams={sp}
          />
        </Suspense>
      </section>
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
        titulo={`No hay asignaciones en estado «${ESTADO_CURSO_LABEL[estado]}»`}
        descripcion="Probá con otro estado o mirá todas las asignaciones."
        hrefLimpiar={hrefConParams(`/admin/cursos/${cursoId}`, searchParams, { estado: null, pagina: null }, "asignados")}
        textoLimpiar="Ver todas"
      />
    ) : (
      <EstadoVacio
        tipo="sin-registros"
        titulo="Todavía no se asignó este curso a ningún postulante"
        descripcion="Se asigna desde la ficha de un postulante o desde el listado de postulantes."
      />
    );
  }

  return (
    <>
      <Tabla
        columnas={COLUMNAS_ASIGNADOS}
        etiqueta="Postulantes asignados"
        semantica="tabla"
        encabezados={["Postulante", "Estado", "Fechas", "Nota interna"]}
      >
        {asignaciones.map((a) => {
          const p = a.postulantes;
          const u = p?.usuarios;
          const nombre = u ? `${u.nombre} ${u.apellido}` : "Postulante eliminado";
          return (
            <FilaTabla key={a.id} semantica="tabla" filete={FILETE_ESTADO_CURSO[a.estado]}>
              <div role="cell" className="min-w-0">
                <CeldaPersona
                  nombre={nombre}
                  href={p ? `/admin/postulantes/${p.id}` : undefined}
                  iniciales={u ? inicialesDePersona(u.nombre, u.apellido) : undefined}
                />
              </div>
              <div role="cell" className="min-w-0">
                <span className="sr-only">Estado: </span>
                <EstadoCursoBadge estado={a.estado} />
              </div>
              <div role="cell" className="min-w-0 text-sm text-muted-foreground-strong">
                <span className="sr-only">Fechas: </span>
                <FechasAsignacion asignacion={a} />
              </div>
              <div role="cell" className="min-w-0 text-sm text-muted-foreground-strong">
                <span className="sr-only">Nota interna: </span>
                {a.nota ? (
                  <span className="flex items-start gap-2">
                    <StickyNote aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-icon" />
                    <span className="min-w-0 break-words whitespace-pre-line">{a.nota}</span>
                  </span>
                ) : (
                  "—"
                )}
              </div>
            </FilaTabla>
          );
        })}
      </Tabla>
      <Paginacion
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
    FilaDb<"asignaciones_curso">,
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
