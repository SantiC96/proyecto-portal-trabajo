import type { Metadata } from "next";
import { Suspense } from "react";
import { AvisoUrl } from "@/components/ui/aviso-url";
import Link from "next/link";
import { Plus, BookOpen } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { logError } from "@/lib/logger";
import { limpiarBusqueda, patronIlike } from "@/lib/busqueda";
import {
  consultarPagina,
  hrefConParams,
  leerPagina,
  type ParamsUrl,
} from "@/lib/paginacion";
import { Buscador } from "@/components/ui/buscador";
import { Paginacion } from "@/components/ui/paginacion";
import { EstadoVacio, ErrorListado } from "@/components/ui/estado-listado";
import { EsqueletoLista } from "@/components/ui/esqueleto";
import { UMBRAL_RECHAZOS_CURSO, VENTANA_RECHAZOS_DIAS } from "@/lib/cursos";
import { requerirRolPagina } from "@/lib/auth";
import { BotonVolver } from "@/components/ui/boton-volver";

export const metadata: Metadata = {
  title: "Cursos | Panel municipal | Portal de Empleo Funes",
};

const RUTA = "/admin/cursos";

export default async function CursosPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; q?: string; pagina?: string }>;
}) {
  await requerirRolPagina("municipalidad");
  const sp = await searchParams;
  const soloActivos = sp.estado !== "inactivos";
  const q = limpiarBusqueda(sp.q);
  const pagina = leerPagina(sp.pagina);

  return (
    <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <Suspense>
        <AvisoUrl />
      </Suspense>
      <BotonVolver href="/admin">Volver al panel</BotonVolver>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Cursos de inserción laboral
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cursos asignables a postulantes con {UMBRAL_RECHAZOS_CURSO} o más rechazos de
            empresas en los últimos {VENTANA_RECHAZOS_DIAS} días.{" "}
            <Link href="/admin/cursos/completados" className="text-primary hover:underline">
              Ver cursos completados
            </Link>
          </p>
        </div>
        <Link href="/admin/cursos/nuevo" className="btn-primario">
          <Plus className="h-4 w-4" />
          Nuevo curso
        </Link>
      </div>

      {/* Filtro activo / inactivo */}
      <div className="mt-6 flex gap-2">
        <Link
          href={hrefConParams(RUTA, {}, { q: sp.q ?? null })}
          className={
            soloActivos
              ? "btn-primario px-4 py-1.5 text-sm"
              : "btn-secundario inline-flex items-center px-4 py-1.5 text-sm"
          }
        >
          Activos
        </Link>
        <Link
          href={hrefConParams(RUTA, {}, { estado: "inactivos", q: sp.q ?? null })}
          className={
            !soloActivos
              ? "btn-primario px-4 py-1.5 text-sm"
              : "btn-secundario inline-flex items-center px-4 py-1.5 text-sm"
          }
        >
          Inactivos
        </Link>
      </div>

      <Buscador className="mt-4" placeholder="Buscar por nombre…" />

      <Suspense
        key={JSON.stringify({ soloActivos, q, pagina })}
        fallback={<EsqueletoLista filas={4} className="mt-6" />}
      >
        <ListadoCursos
          soloActivos={soloActivos}
          q={q}
          pagina={pagina}
          searchParams={sp}
        />
      </Suspense>
    </section>
  );
}

async function ListadoCursos({
  soloActivos,
  q,
  pagina,
  searchParams,
}: {
  soloActivos: boolean;
  q: string;
  pagina: number;
  searchParams: ParamsUrl;
}) {
  const supabase = await createSupabaseServerClient();

  const resultado = await consultarPagina(pagina, (desde, hasta) => {
    let query = supabase
      .from("cursos")
      .select("id, nombre, link, activo", { count: "exact" })
      .eq("activo", soloActivos);
    if (q) query = query.ilike("nombre", patronIlike(q));
    return query
      .order("nombre", { ascending: true })
      .order("id", { ascending: true })
      .range(desde, hasta);
  });

  if (!resultado.ok) {
    const ref = logError("admin_cursos_listado", resultado.error);
    return <ErrorListado className="mt-6" refError={ref} />;
  }

  const cursos = resultado.filas;

  if (cursos.length === 0) {
    return q ? (
      <EstadoVacio
        tipo="sin-resultados"
        className="mt-6"
        titulo="No se encontraron cursos con ese nombre"
        hrefLimpiar={hrefConParams(RUTA, {}, { estado: soloActivos ? null : "inactivos" })}
        textoLimpiar="Limpiar búsqueda"
      />
    ) : (
      <EstadoVacio
        tipo="sin-registros"
        className="mt-6"
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
          {/* Tabla md+ */}
          <div className="mt-6 hidden overflow-x-auto rounded-[var(--radius-lg)] border border-border bg-surface md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-tinted text-left">
                  <th className="px-4 py-3 font-medium text-muted-foreground">
                    Nombre
                  </th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">
                    Link
                  </th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">
                    Asignaciones
                  </th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">
                    Estado
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {cursos.map((c) => (
                  <tr
                    key={c.id}
                    className="transition-colors hover:bg-surface-tinted"
                  >
                    <td className="px-4 py-3 font-medium text-foreground">
                      {c.nombre}
                    </td>
                    <td className="px-4 py-3">
                      {c.link ? (
                        <span className="truncate block max-w-xs text-xs text-primary">
                          Con link
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      {conteosAsignaciones[c.id] ?? 0}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          c.activo
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {c.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-4 py-3 w-px whitespace-nowrap">
                      <Link
                        href={`/admin/cursos/${c.id}`}
                        className="btn-secundario inline-flex items-center justify-center whitespace-nowrap px-3 py-1.5 text-xs"
                      >
                        Ver detalle
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards mobile */}
          <div className="mt-6 space-y-3 md:hidden">
            {cursos.map((c) => (
              <div
                key={c.id}
                className="rounded-[var(--radius-lg)] border border-border bg-surface p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-foreground">{c.nombre}</p>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${
                      c.activo
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {c.activo ? "Activo" : "Inactivo"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {conteosAsignaciones[c.id] ?? 0} asignación
                  {(conteosAsignaciones[c.id] ?? 0) !== 1 ? "es" : ""}
                  {c.link ? " · Con link" : ""}
                </p>
                <Link
                  href={`/admin/cursos/${c.id}`}
                  className="btn-secundario inline-flex items-center justify-center whitespace-nowrap px-3 py-1.5 text-sm"
                >
                  Ver detalle
                </Link>
              </div>
            ))}
          </div>
          <Paginacion
            className="mt-6"
            ruta={RUTA}
            searchParams={searchParams}
            pagina={resultado.pagina}
            total={resultado.total}
          />
    </>
  );
}
