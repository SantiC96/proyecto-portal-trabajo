import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { BookOpen, ChevronRight, ExternalLink, GraduationCap } from "lucide-react";
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
import { BotonVolver } from "@/components/ui/boton-volver";
import { EncabezadoPagina } from "@/components/ui/encabezado-pagina";
import { IconoCuadro } from "@/components/ui/icono-cuadro";

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
  await requerirRolPagina("postulante");

  return (
    <section>
      <div className="space-y-6">
        <BotonVolver href="/perfil" destacado />
        <EncabezadoPagina
          banda
          className="-mt-2"
          titulo="Mis cursos"
          bajada="Ante cualquier duda, comunicate con la Oficina de Empleo."
        />

        <Suspense key={pagina} fallback={<EsqueletoLista filas={3} />}>
          <ListadoMisCursos pagina={pagina} searchParams={sp} />
        </Suspense>
      </div>
    </section>
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
  const [resultado, completados] = await Promise.all([
    consultarPagina<MiCurso>(pagina, async (desde, hasta) => {
      const respuesta = await supabase
        .rpc("mis_cursos_con_estado", undefined, { count: "exact" })
        .order("asignado_en", { ascending: false })
        .order("asignacion_id", { ascending: false })
        .range(desde, hasta);
      const data = respuesta.data ? aMisCursos(respuesta.data) : null;
      return { data, count: respuesta.count, error: respuesta.error };
    }),
    // Para el resumen: todos los completados, no solo los de esta página.
    supabase
      .rpc("mis_cursos_con_estado", undefined, { count: "exact", head: true })
      .eq("estado", "completado"),
  ]);

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

  // Si falla el conteo, la lista se muestra igual, sin el resumen.
  if (completados.error) logError("mis_cursos_completados", completados.error);
  const cantidadCompletados = completados.error ? null : (completados.count ?? 0);

  return (
    <>
      {cantidadCompletados !== null && <ResumenCursos completados={cantidadCompletados} />}

      <ul className="flex flex-col gap-3 sm:gap-4">
        {cursos.map((curso) => (
          <li key={curso.asignacion_id}>
            <TarjetaCurso curso={curso} />
          </li>
        ))}
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

function ResumenCursos({ completados }: { completados: number }) {
  return (
    <section aria-label="Resumen de tus cursos" className="banda-resumen flex items-center gap-4">
      <IconoCuadro icono={GraduationCap} tamano={56} className="bg-primary-foreground/16" />
      <p className="flex flex-col">
        <span className="text-[34px] leading-none font-extrabold tabular-nums">{completados}</span>
        <span className="mt-1 text-[15px] font-semibold text-sidebar-texto">
          {completados === 1 ? "curso completado" : "cursos completados"}
        </span>
      </p>
    </section>
  );
}

/**
 * Todo el curso lleva a su detalle: el link del título se estira sobre la
 * tarjeta. Los botones (empezar, completar, ir al curso) quedan por encima.
 */
function TarjetaCurso({ curso }: { curso: MiCurso }) {
  return (
    <article className="tarjeta tarjeta-panel tarjeta-clickeable group relative grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:gap-x-4">
      <IconoCuadro icono={BookOpen} />

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <h2 className="text-[17px] leading-snug font-extrabold break-words">
            <Link
              href={`/mis-cursos/${curso.asignacion_id}`}
              className="text-primary outline-none group-hover:underline after:absolute after:inset-0 after:rounded-[var(--radius-indicador)] focus-visible:after:shadow-[var(--sombra-foco)]"
            >
              {curso.nombre}
            </Link>
          </h2>
          <EstadoCursoBadge estado={curso.estado} />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{textoFechaCurso(curso)}</p>

        {curso.descripcion && (
          <p className="mt-2.5 line-clamp-3 text-[15px] leading-normal text-foreground">
            {curso.descripcion}
          </p>
        )}

        {curso.estado === "abandonado" && (
          <p className="mt-2.5 text-sm text-muted-foreground">
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
      </div>

      {/* Lo dice el link del título: acá es solo la pista visual. */}
      <span
        aria-hidden="true"
        className="col-start-2 inline-flex items-center gap-1 text-[15px] font-bold whitespace-nowrap text-primary group-hover:underline sm:col-start-3 sm:row-start-1 sm:self-center"
      >
        Ver curso
        <ChevronRight className="size-4" />
      </span>
    </article>
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
