import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requerirRolPagina } from "@/lib/auth";
import { esUuid } from "@/lib/validaciones";
import { formatFechaCorta } from "@/lib/fechas";
import { aMisCursos, type MiCurso } from "@/lib/cursos";
import { EstadoCursoBadge } from "@/components/cursos/estado-curso-badge";
import { AccionesMiCurso } from "../acciones-mi-curso";
import { BotonVolver } from "@/components/ui/boton-volver";
import { Aviso } from "@/components/ui/aviso";

async function obtenerMiCurso(asignacionId: string): Promise<MiCurso | null> {
  if (!esUuid(asignacionId)) return null;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .rpc("mis_cursos_con_estado")
    .eq("asignacion_id", asignacionId)
    .maybeSingle();
  return data ? (aMisCursos([data])[0] ?? null) : null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ asignacionId: string }>;
}): Promise<Metadata> {
  const { asignacionId } = await params;
  const curso = await obtenerMiCurso(asignacionId);
  if (!curso) return { title: "Curso no encontrado | Portal de Empleo Funes" };
  return { title: `${curso.nombre} | Portal de Empleo Funes` };
}

export default async function MiCursoDetallePage({
  params,
}: {
  params: Promise<{ asignacionId: string }>;
}) {
  const { asignacionId } = await params;
  await requerirRolPagina("postulante");

  const curso = await obtenerMiCurso(asignacionId);

  if (!curso) notFound();

  return (
    <section className="px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <BotonVolver href="/mis-cursos">Volver a mis cursos</BotonVolver>

        <article className="mt-6 rounded-2xl border border-border bg-white p-6 shadow-xs sm:p-8 space-y-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {curso.nombre}
              </h1>
              <EstadoCursoBadge estado={curso.estado} />
            </div>
            <dl className="mt-2 space-y-0.5 text-sm text-muted-foreground">
              <div>
                <dt className="inline">Asignado el </dt>
                <dd className="inline">{formatFechaCorta(curso.asignado_en)}</dd>
              </div>
              {curso.iniciado_en && (
                <div>
                  <dt className="inline">Empezado el </dt>
                  <dd className="inline">{formatFechaCorta(curso.iniciado_en)}</dd>
                </div>
              )}
              {curso.completado_en && (
                <div>
                  <dt className="inline">Completado el </dt>
                  <dd className="inline">{formatFechaCorta(curso.completado_en)}</dd>
                </div>
              )}
              {curso.estado === "abandonado" && curso.abandonado_en && (
                <div>
                  <dt className="inline">Abandonado el </dt>
                  <dd className="inline">{formatFechaCorta(curso.abandonado_en)}</dd>
                </div>
              )}
            </dl>
          </div>

          {curso.estado === "abandonado" && (
            <p className="rounded-[var(--radius-md)] bg-surface-tinted px-4 py-3 text-sm text-muted-foreground-strong">
              Este curso figura como abandonado y ya no se puede retomar. Si
              necesitás otro curso, comunicate con la Oficina de Empleo.
            </p>
          )}

          {curso.estado === "completado" && (
            <Aviso tono="success">
              Ya le avisamos a la Oficina de Empleo que completaste este curso.
            </Aviso>
          )}

          <AccionesMiCurso
            asignacionId={curso.asignacion_id}
            estado={curso.estado}
            nombreCurso={curso.nombre}
          />

          {curso.descripcion && (
            <div>
              <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-primary">
                Descripción
              </h2>
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {curso.descripcion}
              </p>
            </div>
          )}

          {curso.indicaciones && (
            <div className="rounded-[var(--radius-md)] bg-surface-tinted px-4 py-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Indicaciones
              </p>
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {curso.indicaciones}
              </p>
            </div>
          )}

          {curso.link && curso.estado !== "abandonado" && (
            <div className="space-y-2">
              <a
                href={curso.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-hover"
              >
                Ir al curso
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <p className="break-all text-xs text-muted-foreground">{curso.link}</p>
            </div>
          )}
        </article>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Ante cualquier duda, comunicate con la Oficina de Empleo.
        </p>
      </div>
    </section>
  );
}
