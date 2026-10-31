import type { Metadata } from "next";
import { Suspense } from "react";
import { AvisoUrl } from "@/components/ui/aviso-url";
import Link from "next/link";
import { BookOpen, Link as IconoLink, Users } from "lucide-react";
import { AccionesCursos, bajadaCursos } from "./encabezado-cursos";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { logError } from "@/lib/logger";
import { limpiarBusqueda } from "@/lib/busqueda";
import {
  consultarPagina,
  hrefConParams,
  leerPagina,
  type ParamsUrl,
} from "@/lib/paginacion";
import {
  LABEL_PESTANA_CURSOS,
  PESTANAS_CURSOS,
  filtrarCursos,
  leerPestanaCursos,
  type PestanaCursos,
} from "@/lib/admin/filtro-cursos";
import { Buscador } from "@/components/ui/buscador";
import { Paginacion } from "@/components/ui/paginacion";
import { PastillaFiltro } from "@/components/ui/pastilla-filtro";
import { EncabezadoPagina } from "@/components/ui/encabezado-pagina";
import { EstadoVacio, ErrorListado } from "@/components/ui/estado-listado";
import { EsqueletoCursos } from "@/components/cursos/esqueleto-curso";
import { TarjetaCurso } from "@/components/cursos/tarjeta-curso";
import { requerirRolPagina } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { BotonVolver } from "@/components/ui/boton-volver";

export const metadata: Metadata = {
  title: "Cursos | Panel municipal | Portal de Empleo Funes",
};

const RUTA = "/admin/cursos";

function hrefPestana(pestana: PestanaCursos, q: string | undefined): string {
  return hrefConParams(RUTA, {}, { estado: pestana === "inactivos" ? "inactivos" : null, q: q ?? null });
}

export default async function CursosPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; q?: string; pagina?: string }>;
}) {
  await requerirRolPagina("municipalidad");
  const sp = await searchParams;
  const pestana = leerPestanaCursos(sp.estado);
  const q = limpiarBusqueda(sp.q);
  const pagina = leerPagina(sp.pagina);
  const cantidades = await contarCursos(q);

  return (
    <section className="flex flex-col gap-6">
      <Suspense>
        <AvisoUrl />
      </Suspense>
      <BotonVolver href="/admin" destacado />
      <EncabezadoPagina
        banda
        className="-mt-2"
        botonesBlancos
        titulo="Cursos de inserción laboral"
        bajada={bajadaCursos}
        acciones={<AccionesCursos />}
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
        <nav aria-label="Estado de los cursos" className="min-w-0">
          <div className="sin-barra-scroll -mx-4 -my-1 flex gap-2 overflow-x-auto px-4 py-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
            {PESTANAS_CURSOS.map((p) => (
              <PastillaFiltro
                key={p}
                href={hrefPestana(p, sp.q)}
                activa={p === pestana}
                cantidad={cantidades[p] ?? undefined}
              >
                {LABEL_PESTANA_CURSOS[p]}
              </PastillaFiltro>
            ))}
          </div>
        </nav>

        <Buscador
          className="w-full min-w-0 lg:w-[22rem] lg:shrink-0"
          inputClassName="rounded-xl"
          placeholder="Buscar por nombre…"
        />
      </div>

      <Suspense
        key={JSON.stringify({ pestana, q, pagina })}
        fallback={<EsqueletoCursos cantidad={4} pista="Ver detalle" />}
      >
        <ListadoCursos pestana={pestana} q={q} pagina={pagina} searchParams={sp} />
      </Suspense>
    </section>
  );
}

/**
 * Cantidad de cursos de cada pestaña con la búsqueda, para las pastillas.
 * null si el conteo falló: la pastilla va sin número.
 */
async function contarCursos(q: string): Promise<Record<PestanaCursos, number | null>> {
  const supabase = await createSupabaseServerClient();
  const contar = async (pestana: PestanaCursos) => {
    const { count, error } = await filtrarCursos(
      supabase.from("cursos").select("id", { count: "exact", head: true }),
      pestana,
      q,
    );
    if (error) {
      logError("admin_cursos_conteo_estado", error, { pestana });
      return null;
    }
    return count ?? 0;
  };
  const [activos, inactivos] = await Promise.all([contar("activos"), contar("inactivos")]);
  return { activos, inactivos };
}

async function ListadoCursos({
  pestana,
  q,
  pagina,
  searchParams,
}: {
  pestana: PestanaCursos;
  q: string;
  pagina: number;
  searchParams: ParamsUrl;
}) {
  const supabase = await createSupabaseServerClient();
  const soloActivos = pestana === "activos";

  const resultado = await consultarPagina(pagina, (desde, hasta) =>
    filtrarCursos(
      supabase
        .from("cursos")
        .select("id, nombre, descripcion, link, activo", { count: "exact" }),
      pestana,
      q,
    )
      .order("nombre", { ascending: true })
      .order("id", { ascending: true })
      .range(desde, hasta),
  );

  if (!resultado.ok) {
    const ref = logError("admin_cursos_listado", resultado.error);
    return <ErrorListado refError={ref} />;
  }

  const cursos = resultado.filas;

  if (cursos.length === 0) {
    return q ? (
      <EstadoVacio
        tipo="sin-resultados"
        titulo="No se encontraron cursos con ese nombre"
        hrefLimpiar={hrefPestana(pestana, undefined)}
        textoLimpiar="Limpiar búsqueda"
      />
    ) : (
      <EstadoVacio
        tipo="sin-registros"
        icono={BookOpen}
        titulo={soloActivos ? "No hay cursos activos" : "No hay cursos inactivos"}
        accion={
          soloActivos ? (
            <Link href="/admin/cursos/nuevo" className="btn-primario inline-flex">
              Crear primer curso
            </Link>
          ) : undefined
        }
      />
    );
  }

  // Asignaciones solo de los cursos de esta página.
  const { data: conteosData, error: conteosError } = await supabase
    .from("asignaciones_curso")
    .select("curso_id")
    .in(
      "curso_id",
      cursos.map((c) => c.id)
    );
  if (conteosError) logError("admin_cursos_conteo_asignaciones", conteosError);

  const conteosAsignaciones: Record<string, number> = {};
  for (const row of conteosData ?? []) {
    conteosAsignaciones[row.curso_id] =
      (conteosAsignaciones[row.curso_id] ?? 0) + 1;
  }

  return (
    <>
      <ul className="flex flex-col gap-3 sm:gap-4" aria-label={soloActivos ? "Cursos activos" : "Cursos inactivos"}>
        {cursos.map((c) => {
          const asignaciones = conteosAsignaciones[c.id] ?? 0;
          return (
            <li key={c.id}>
              <TarjetaCurso
                href={`/admin/cursos/${c.id}`}
                nombre={c.nombre}
                badge={
                  <Badge tono={c.activo ? "success" : "neutral"} estado>
                    {c.activo ? "Activo" : "Inactivo"}
                  </Badge>
                }
                descripcion={c.descripcion}
                pista={{ texto: "Ver detalle", etiqueta: `Ver detalle de ${c.nombre}` }}
              >
                <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted-foreground-strong">
                  <li className="inline-flex items-center gap-1.5">
                    <Users className="size-4 shrink-0 text-muted-icon" aria-hidden="true" />
                    {conteosError
                      ? "Asignaciones sin datos"
                      : `${asignaciones} ${asignaciones === 1 ? "asignación" : "asignaciones"}`}
                  </li>
                  <li className="inline-flex min-w-0 max-w-full items-center gap-1.5">
                    <IconoLink className="size-4 shrink-0 text-muted-icon" aria-hidden="true" />
                    {c.link ? (
                      <span className="min-w-0 truncate" title={c.link}>
                        <span className="sr-only">Link: </span>
                        {c.link.replace(/^https:\/\//, "")}
                      </span>
                    ) : (
                      "Sin link"
                    )}
                  </li>
                </ul>
              </TarjetaCurso>
            </li>
          );
        })}
      </ul>
      <Paginacion
        ruta={RUTA}
        searchParams={searchParams}
        pagina={resultado.pagina}
        total={resultado.total}
      />
    </>
  );
}
