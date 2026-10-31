import type { Metadata } from "next";
import { Suspense } from "react";
import { BookOpen, GraduationCap } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requerirRolPagina } from "@/lib/auth";
import { logError } from "@/lib/logger";
import { formatFechaCorta } from "@/lib/fechas";
import { consultarPagina, leerPagina, type ParamsUrl } from "@/lib/paginacion";
import { Paginacion } from "@/components/ui/paginacion";
import { EstadoVacio, ErrorListado } from "@/components/ui/estado-listado";
import { EsqueletoMisCursos } from "@/components/cursos/esqueleto-curso";
import { EstadoCursoBadge } from "@/components/cursos/estado-curso-badge";
import { aMisCursos, type MiCurso } from "@/lib/cursos";
import { AccionesMiCurso } from "../acciones-mi-curso";
import { BotonVolver } from "@/components/ui/boton-volver";
import { EncabezadoPagina } from "@/components/ui/encabezado-pagina";
import { IconoCuadro } from "@/components/ui/icono-cuadro";
import { BotonIrAlCurso, TarjetaCurso } from "@/components/cursos/tarjeta-curso";

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
        <BotonVolver href="/panel" destacado />
        <EncabezadoPagina
          banda
          className="-mt-2"
          titulo="Mis cursos"
          bajada="Ante cualquier duda, comunicate con la Oficina de Empleo."
        />

        <Suspense key={pagina} fallback={<EsqueletoMisCursos />}>
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
            <TarjetaMiCurso curso={curso} />
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
function TarjetaMiCurso({ curso }: { curso: MiCurso }) {
  return (
    <TarjetaCurso
      href={`/mis-cursos/${curso.asignacion_id}`}
      nombre={curso.nombre}
      badge={<EstadoCursoBadge estado={curso.estado} />}
      detalle={textoFechaCurso(curso)}
      descripcion={curso.descripcion}
      pista={{ texto: "Ver curso" }}
    >
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

      {curso.link && curso.estado !== "abandonado" && <BotonIrAlCurso link={curso.link} />}
    </TarjetaCurso>
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
