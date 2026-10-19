import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { logError } from "@/lib/logger";
import { formatFechaCorta, haceDiasISO } from "@/lib/fechas";
import { consultarPagina, leerPagina, type ParamsUrl } from "@/lib/paginacion";
import { DIAS_CURSOS_COMPLETADOS_RECIENTES } from "@/lib/cursos";
import { Paginacion } from "@/components/ui/paginacion";
import { EstadoVacio, ErrorListado } from "@/components/ui/estado-listado";
import { EsqueletoLista } from "@/components/ui/esqueleto";
import { requerirRolPagina } from "@/lib/auth";
import { BotonVolver } from "@/components/ui/boton-volver";

export const metadata: Metadata = {
  title: "Cursos completados | Panel municipal | Portal de Empleo Funes",
};

const RUTA = "/admin/cursos/completados";

export default async function CursosCompletadosPage({
  searchParams,
}: {
  searchParams: Promise<{ pagina?: string }>;
}) {
  await requerirRolPagina("municipalidad");
  const sp = await searchParams;
  const pagina = leerPagina(sp.pagina);

  return (
    <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <BotonVolver href="/admin/cursos">Volver a cursos</BotonVolver>

      <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        Cursos completados
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Postulantes que marcaron un curso como completado en los últimos{" "}
        {DIAS_CURSOS_COMPLETADOS_RECIENTES} días. Sus rechazos anteriores ya no cuentan
        para un nuevo curso.
      </p>

      <Suspense key={pagina} fallback={<EsqueletoLista filas={4} className="mt-6" />}>
        <ListadoCompletados pagina={pagina} searchParams={sp} />
      </Suspense>
    </section>
  );
}

async function ListadoCompletados({
  pagina,
  searchParams,
}: {
  pagina: number;
  searchParams: ParamsUrl;
}) {
  const supabase = await createSupabaseServerClient();
  const desde = haceDiasISO(DIAS_CURSOS_COMPLETADOS_RECIENTES);

  const resultado = await consultarPagina(pagina, (inicio, fin) =>
    supabase
      .from("asignaciones_curso")
      .select(
        "id, completado_en, cursos!curso_id(id, nombre), postulantes!postulante_id(id, usuarios!usuario_id(nombre, apellido))",
        { count: "exact" }
      )
      .eq("estado", "completado")
      .gte("completado_en", desde)
      .order("completado_en", { ascending: false })
      .order("id", { ascending: false })
      .range(inicio, fin)
  );

  if (!resultado.ok) {
    const ref = logError("admin_cursos_completados", resultado.error);
    return (
      <ErrorListado
        className="mt-6"
        mensaje="No pudimos cargar los cursos completados."
        refError={ref}
      />
    );
  }

  if (resultado.filas.length === 0) {
    return (
      <EstadoVacio
        tipo="sin-registros"
        className="mt-6"
        icono={CheckCircle2}
        titulo={`Nadie completó un curso en los últimos ${DIAS_CURSOS_COMPLETADOS_RECIENTES} días`}
      />
    );
  }

  return (
    <>
      <ul className="mt-6 divide-y divide-border rounded-[var(--radius-lg)] border border-border bg-surface">
        {resultado.filas.map((a) => {
          const u = a.postulantes?.usuarios;
          const nombre = u ? `${u.nombre} ${u.apellido}` : "Postulante eliminado";
          return (
            <li
              key={a.id}
              className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="font-medium text-foreground">{nombre}</p>
                <p className="text-sm text-muted-foreground">
                  {a.cursos ? (
                    <Link
                      href={`/admin/cursos/${a.cursos.id}`}
                      className="text-primary hover:underline"
                    >
                      {a.cursos.nombre}
                    </Link>
                  ) : (
                    "Curso eliminado"
                  )}{" "}
                  · Completado el {formatFechaCorta(a.completado_en)}
                </p>
              </div>
              {a.postulantes && (
                <Link
                  href={`/admin/postulantes/${a.postulantes.id}`}
                  className="btn-secundario inline-flex min-h-11 shrink-0 items-center justify-center px-3 text-sm sm:min-h-9"
                >
                  Ver ficha
                </Link>
              )}
            </li>
          );
        })}
      </ul>
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
