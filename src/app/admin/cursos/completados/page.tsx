import type { Metadata } from "next";
import { COLUMNAS, EsqueletoCompletados } from "./esqueleto";
import { Suspense } from "react";
import Link from "next/link";
import { BookOpen, Calendar, CheckCircle2 } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { logError } from "@/lib/logger";
import { formatFechaCorta, haceDiasISO } from "@/lib/fechas";
import { inicialesDePersona } from "@/lib/iniciales";
import { consultarPagina, leerPagina, type ParamsUrl } from "@/lib/paginacion";
import { DIAS_CURSOS_COMPLETADOS_RECIENTES } from "@/lib/cursos";
import { Paginacion } from "@/components/ui/paginacion";
import { EstadoVacio, ErrorListado } from "@/components/ui/estado-listado";
import { requerirRolPagina } from "@/lib/auth";
import { BotonVolver } from "@/components/ui/boton-volver";
import { EncabezadoPagina } from "@/components/ui/encabezado-pagina";
import { CLASE_ACCION_FILA, CeldaPersona, FilaTabla, Tabla } from "@/components/ui/tabla";

export const metadata: Metadata = {
  title: "Cursos completados | Panel municipal | Portal de Empleo Funes",
};

const RUTA = "/admin/cursos/completados";

const CLASE_DATO =
  "flex min-w-0 items-center gap-2 text-sm break-words text-muted-foreground-strong @4xl:block @4xl:text-[15px] @4xl:text-foreground";
const CLASE_ICONO_DATO = "size-4 shrink-0 text-muted-icon @4xl:hidden";

export default async function CursosCompletadosPage({
  searchParams,
}: {
  searchParams: Promise<{ pagina?: string }>;
}) {
  await requerirRolPagina("municipalidad");
  const sp = await searchParams;
  const pagina = leerPagina(sp.pagina);

  return (
    <section className="flex flex-col gap-6">
      <BotonVolver href="/admin/cursos" destacado />

      <EncabezadoPagina
        banda
        botonesBlancos
        className="-mt-2"
        titulo="Cursos completados"
        bajada={`Postulantes que marcaron un curso como completado en los últimos ${DIAS_CURSOS_COMPLETADOS_RECIENTES} días. Sus rechazos anteriores ya no cuentan para un nuevo curso.`}
      />

      <Suspense key={pagina} fallback={<EsqueletoCompletados />}>
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
        mensaje="No pudimos cargar los cursos completados."
        refError={ref}
      />
    );
  }

  if (resultado.filas.length === 0) {
    return (
      <EstadoVacio
        tipo="sin-registros"
        icono={CheckCircle2}
        titulo={`Nadie completó un curso en los últimos ${DIAS_CURSOS_COMPLETADOS_RECIENTES} días`}
      />
    );
  }

  return (
    <>
      <Tabla
        columnas={COLUMNAS}
        etiqueta="Cursos completados"
        semantica="tabla"
        encabezados={[
          "Postulante",
          "Curso",
          "Completado el",
          <span key="a" className="sr-only">
            Acciones
          </span>,
        ]}
      >
        {resultado.filas.map((a) => {
          const u = a.postulantes?.usuarios;
          const nombre = u ? `${u.nombre} ${u.apellido}` : "Postulante eliminado";
          return (
            <FilaTabla key={a.id} semantica="tabla" filete="before:bg-success">
              <div role="cell" className="min-w-0">
                <CeldaPersona
                  nombre={nombre}
                  iniciales={u ? inicialesDePersona(u.nombre, u.apellido) : undefined}
                />
              </div>
              <div role="cell" className={CLASE_DATO}>
                <BookOpen aria-hidden="true" className={CLASE_ICONO_DATO} />
                <span className="min-w-0">
                  <span className="sr-only">Curso: </span>
                  {a.cursos ? (
                    <Link
                      href={`/admin/cursos/${a.cursos.id}`}
                      className="font-semibold text-primary hover:underline"
                    >
                      {a.cursos.nombre}
                    </Link>
                  ) : (
                    "Curso eliminado"
                  )}
                </span>
              </div>
              <div role="cell" className={`${CLASE_DATO} whitespace-nowrap tabular-nums`}>
                <Calendar aria-hidden="true" className={CLASE_ICONO_DATO} />
                <span>
                  <span className="@4xl:sr-only">Completado el </span>
                  {formatFechaCorta(a.completado_en)}
                </span>
              </div>
              <div role="cell" className="@4xl:text-right">
                {a.postulantes && (
                  <Link
                    href={`/admin/postulantes/${a.postulantes.id}`}
                    aria-label={`Ver ficha de ${nombre}`}
                    className={`btn-secundario ${CLASE_ACCION_FILA}`}
                  >
                    Ver ficha
                  </Link>
                )}
              </div>
            </FilaTabla>
          );
        })}
      </Tabla>
      <Paginacion
        ruta={RUTA}
        searchParams={searchParams}
        pagina={resultado.pagina}
        total={resultado.total}
      />
    </>
  );
}
