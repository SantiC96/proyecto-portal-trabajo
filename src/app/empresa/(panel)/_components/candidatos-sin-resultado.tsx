import Link from "next/link";
import { Calendar, ChevronRight, UserCheck } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { logError } from "@/lib/logger";
import { formatFechaHora } from "@/lib/fechas";
import { inicialesDePersona } from "@/lib/iniciales";
import { DIAS_SIN_RESULTADO } from "@/lib/derivacion-estados";
import { IconoCuadro } from "@/components/ui/icono-cuadro";

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

  const filas = data ?? [];
  if (filas.length === 0) return null;

  const visibles = filas.slice(0, 10);

  return (
    <section aria-labelledby="sin-resultado-titulo" className="aviso-respuesta text-accent-foreground">
      <div className="flex items-start gap-3.5">
        <IconoCuadro icono={UserCheck} tamano={44} className="bg-accent text-accent-foreground" />
        <div className="min-w-0">
          <h2 id="sin-resultado-titulo" className="text-lg leading-snug font-extrabold text-accent-foreground">
            {filas.length === 1
              ? "Tenés 1 candidato esperando tu respuesta"
              : `Tenés ${filas.length} candidatos esperando tu respuesta`}
          </h2>
          <p className="mt-0.5 text-[15px] leading-[1.45] text-invitacion-detalle">
            La entrevista fue hace más de {DIAS_SIN_RESULTADO} días. Indicá si lo
            seleccionaste o no para que la Oficina de Empleo pueda seguir acompañándolo.
          </p>
        </div>
      </div>

      <ul className="mt-4 flex flex-col gap-2.5">
        {visibles.map((f) => {
          const nombre = `${f.nombre} ${f.apellido}`;
          return (
            <li
              key={f.derivacion_id}
              className="flex flex-col gap-3 rounded-[14px] border border-aviso-fila-borde bg-surface p-3.5 sm:flex-row sm:items-center sm:gap-4 sm:px-4"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span
                  aria-hidden="true"
                  className="grid size-11 shrink-0 place-items-center rounded-full bg-primary text-[15px] font-bold text-primary-foreground"
                >
                  {inicialesDePersona(f.nombre, f.apellido)}
                </span>
                <div className="min-w-0">
                  <p className="text-base leading-snug break-words text-heading">
                    <span className="font-extrabold">{nombre}</span>
                    <span className="text-muted-foreground-strong"> · {f.oferta_titulo}</span>
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground-strong">
                    <Calendar className="size-4 shrink-0 text-info" aria-hidden="true" />
                    Entrevista: {formatFechaHora(f.fecha_entrevista)}
                  </p>
                </div>
              </div>
              <Link
                href={`/empresa/ofertas/${f.oferta_id}/candidatos/${f.derivacion_id}`}
                aria-label={`Responder: ${nombre}, ${f.oferta_titulo}`}
                className="btn-secundario btn-chico w-full shrink-0 sm:w-auto"
              >
                Responder
                <ChevronRight aria-hidden="true" />
              </Link>
            </li>
          );
        })}
      </ul>
      {filas.length > visibles.length && (
        <p className="mt-3 text-sm text-invitacion-detalle">
          Y {filas.length - visibles.length} más. Los encontrás en cada oferta, en Mis ofertas.
        </p>
      )}
    </section>
  );
}
