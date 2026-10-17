import Link from "next/link";
import { BookOpen, ChevronRight } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { logError } from "@/lib/logger";
import { aMisCursos, UMBRAL_RECHAZOS_CURSO, type MiCurso } from "@/lib/cursos";
import { cn } from "@/lib/utils";

/**
 * Aviso para el postulante con cursos asignados o en curso (puede tener
 * varios a la vez desde migration_046). Se renderiza en el servidor y no
 * muestra nada si no tiene cursos pendientes. Nunca bloquea las
 * postulaciones: el texto lo aclara.
 */
export async function AvisoCursoPendiente({ className }: { className?: string }) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .rpc("mis_cursos_con_estado")
    .in("estado", ["asignado", "en_curso"])
    .order("asignado_en", { ascending: false });

  if (error) {
    logError("aviso_curso_pendiente", error);
    return null;
  }

  const cursos = aMisCursos(data ?? []);
  if (cursos.length === 0) return null;

  const [unico] = cursos;

  return (
    <div
      role="status"
      className={cn(
        "rounded-[var(--radius-lg)] border border-amber-200 bg-amber-50 p-4 sm:p-5",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800">
          <BookOpen className="h-4.5 w-4.5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          {cursos.length === 1 ? (
            <>
              <p className="text-sm text-amber-900">
                {unico.por_rechazos
                  ? `Tuviste ${UMBRAL_RECHAZOS_CURSO} rechazos recientes y la Oficina de Empleo te asignó un curso: `
                  : "La Oficina de Empleo te asignó un curso: "}
                <span className="font-semibold">{unico.nombre}</span>.{" "}
                Podés seguir postulándote mientras lo hacés.
              </p>
              <EnlaceCurso curso={unico} className="mt-2" />
            </>
          ) : (
            <>
              <p className="text-sm text-amber-900">
                La Oficina de Empleo te asignó {cursos.length} cursos que todavía tenés
                pendientes. Podés seguir postulándote mientras los hacés.
              </p>
              <ul className="mt-1">
                {cursos.map((curso) => (
                  <li key={curso.asignacion_id}>
                    <EnlaceCurso curso={curso} conNombre />
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function EnlaceCurso({
  curso,
  conNombre = false,
  className,
}: {
  curso: MiCurso;
  conNombre?: boolean;
  className?: string;
}) {
  const accion = curso.estado === "en_curso" ? "Seguir con el curso" : "Ver el curso";
  return (
    <Link
      href={`/mis-cursos/${curso.asignacion_id}`}
      className={cn(
        "inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-primary underline-offset-2 hover:underline",
        className,
      )}
    >
      {conNombre ? `${curso.nombre} · ${accion}` : accion}
      <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />
    </Link>
  );
}
