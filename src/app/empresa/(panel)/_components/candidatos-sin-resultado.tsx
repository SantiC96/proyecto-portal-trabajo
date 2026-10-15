import Link from "next/link";
import { ChevronRight, UserCheck } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { logError } from "@/lib/logger";
import { formatFechaHora } from "@/lib/fechas";
import { DIAS_SIN_RESULTADO } from "@/lib/derivacion-estados";

type FilaSinResultado = {
  derivacion_id: string;
  oferta_id: string;
  oferta_titulo: string;
  postulante_id: string;
  nombre: string;
  apellido: string;
  estado_empresa: "pendiente" | "en_proceso";
  fecha_entrevista: string;
};

/**
 * Recordatorio de contratación: candidatos cuya entrevista pasó hace más de
 * DIAS_SIN_RESULTADO días y siguen sin respuesta. Cada fila lleva a la ficha
 * del candidato, donde están las acciones Seleccionar / No seleccionar.
 */
export async function CandidatosSinResultado() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("derivaciones_sin_resultado_empresa", {
    p_dias: DIAS_SIN_RESULTADO,
  });

  if (error) {
    logError("empresa_candidatos_sin_resultado", error);
    return null;
  }

  const filas = (data ?? []) as FilaSinResultado[];
  if (filas.length === 0) return null;

  const visibles = filas.slice(0, 10);

  return (
    <section
      aria-labelledby="sin-resultado-titulo"
      className="mt-8 rounded-[var(--radius-lg)] border border-amber-200 bg-amber-50 p-4 sm:p-5"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800">
          <UserCheck className="h-4.5 w-4.5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h2 id="sin-resultado-titulo" className="font-semibold text-amber-900">
            {filas.length === 1
              ? "Tenés 1 candidato esperando tu respuesta: ¿lo contrataste?"
              : `Tenés ${filas.length} candidatos esperando tu respuesta: ¿los contrataste?`}
          </h2>
          <p className="mt-0.5 text-sm text-amber-900/80">
            La entrevista fue hace más de {DIAS_SIN_RESULTADO} días. Indicá si lo
            seleccionaste o no para que la Oficina de Empleo pueda seguir acompañándolo.
          </p>
        </div>
      </div>

      <ul className="mt-4 divide-y divide-amber-200 overflow-hidden rounded-[var(--radius-md)] border border-amber-200 bg-white">
        {visibles.map((f) => (
          <li key={f.derivacion_id}>
            <Link
              href={`/empresa/ofertas/${f.oferta_id}/candidatos/${f.derivacion_id}`}
              className="flex min-h-11 items-center justify-between gap-3 px-3 py-3 transition hover:bg-surface-tinted"
            >
              <span className="min-w-0">
                <span className="block font-medium text-foreground">
                  {f.nombre} {f.apellido}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {f.oferta_titulo} · Entrevista: {formatFechaHora(f.fecha_entrevista)}
                </span>
              </span>
              <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-primary">
                Responder
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {filas.length > visibles.length && (
        <p className="mt-2 text-xs text-amber-900/80">
          Y {filas.length - visibles.length} más. Los encontrás en cada oferta, en Mis ofertas.
        </p>
      )}
    </section>
  );
}
