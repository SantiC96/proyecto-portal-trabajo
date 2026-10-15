import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { BookOpen, ExternalLink } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requerirRolPagina } from "@/lib/auth";
import { logError } from "@/lib/logger";
import { formatFechaCorta } from "@/lib/fechas";
import { consultarPagina, leerPagina, type ParamsUrl } from "@/lib/paginacion";
import { Paginacion } from "@/components/ui/paginacion";
import { EstadoVacio, ErrorListado } from "@/components/ui/estado-listado";
import { EsqueletoLista } from "@/components/ui/esqueleto";
import { EstadoCursoBadge } from "@/components/cursos/estado-curso-badge";
import { aMisCursos, type MiCurso } from "@/lib/cursos";
import { AccionesMiCurso } from "./acciones-mi-curso";

export const metadata: Metadata = {
  title: "Mis cursos | Portal de Empleo Funes",
};

const RUTA = "/mis-cursos";

export default async function MisCursosPage({
  searchParams,
}: {
  searchParams: Promise<{ pagina?: string }>;
}) {
  const sp = await searchParams;
  const pagina = leerPagina(sp.pagina);
  await requerirRolPagina("postulante", { siNoCorresponde: "panel" });

  return (
    <main className="flex-1 px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Mis cursos
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ante cualquier duda, comunicate con la Oficina de Empleo.
          </p>
        </div>

        <Suspense key={pagina} fallback={<EsqueletoLista filas={3} />}>
          <ListadoMisCursos pagina={pagina} searchParams={sp} />
        </Suspense>
      </div>
    </main>
  );
}

async function ListadoMisCursos({
  pagina,
  searchParams,
}: {
  pagina: number;
  searchParams: ParamsUrl;
}) {
  const supabase = await createSupabaseServerClient();

  // mis_cursos_con_estado devuelve un conjunto de filas: PostgREST permite
  // ordenarlo, contarlo y paginarlo como si fuera una tabla.
  const resultado = await consultarPagina<MiCurso>(pagina, async (desde, hasta) => {
    const respuesta = await supabase
      .rpc("mis_cursos_con_estado", undefined, { count: "exact" })
      .order("asignado_en", { ascending: false })
      .order("asignacion_id", { ascending: false })
      .range(desde, hasta);
    const data = respuesta.data ? aMisCursos(respuesta.data) : null;
    return { data, count: respuesta.count, error: respuesta.error };
  });

  if (!resultado.ok) {
    const ref = logError("mis_cursos_listado", resultado.error);
    return (
      <ErrorListado
        mensaje="No pudimos cargar tus cursos. Intentá de nuevo en unos minutos."
        refError={ref}
      />
    );
  }

  const cursos = resultado.filas;

  if (cursos.length === 0) {
    return (
      <EstadoVacio
        tipo="sin-registros"
        icono={BookOpen}
        titulo="No tenés cursos asignados"
        descripcion="Cuando la Oficina de Empleo te asigne uno, aparecerá acá."
      />
    );
  }

  return (
    <>
          <div className="space-y-4">
            {cursos.map((curso) => (
              <article
                key={curso.asignacion_id}
                className="group relative rounded-xl border border-border bg-white p-4 shadow-xs transition hover:border-primary/40 hover:shadow-md sm:p-5"
              >
                {/* Stretched link — makes the whole card clickable */}
                <Link
                  href={`/mis-cursos/${curso.asignacion_id}`}
                  className="absolute inset-0 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-[-2px]"
                  aria-label={`Ver detalles de ${curso.nombre}`}
                />

                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <BookOpen className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-primary underline-offset-2 group-hover:underline">
                        {curso.nombre}
                      </p>
                      <EstadoCursoBadge estado={curso.estado} />
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {textoFechaCurso(curso)}
                    </p>
                  </div>
                </div>

                {curso.descripcion && (
                  <p className="mt-3 line-clamp-3 text-sm text-foreground">
                    {curso.descripcion}
                  </p>
                )}

                {curso.estado === "abandonado" && (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Este curso figura como abandonado y ya no se puede retomar. Si
                    necesitás otro curso, comunicate con la Oficina de Empleo.
                  </p>
                )}

                <AccionesMiCurso
                  className="mt-3"
                  asignacionId={curso.asignacion_id}
                  estado={curso.estado}
                  nombreCurso={curso.nombre}
                />

                {curso.link && curso.estado !== "abandonado" && (
                  <div className="mt-3">
                    <a
                      href={curso.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative z-10 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-hover"
                    >
                      Ir al curso
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                )}
              </article>
            ))}
          </div>
          <Paginacion
            ruta={RUTA}
            searchParams={searchParams}
            pagina={resultado.pagina}
            total={resultado.total}
          />
    </>
  );
}

function textoFechaCurso(curso: MiCurso): string {
  if (curso.estado === "completado" && curso.completado_en)
    return `Completado el ${formatFechaCorta(curso.completado_en)}`;
  if (curso.estado === "abandonado" && curso.abandonado_en)
    return `Abandonado el ${formatFechaCorta(curso.abandonado_en)}`;
  if (curso.estado === "en_curso" && curso.iniciado_en)
    return `Empezado el ${formatFechaCorta(curso.iniciado_en)}`;
  return `Asignado el ${formatFechaCorta(curso.asignado_en)}`;
}
