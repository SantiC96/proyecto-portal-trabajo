import Link from "next/link";
import { ChevronDown, Mail } from "lucide-react";
import { EstadoVacio, ErrorListado } from "@/components/ui/estado-listado";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { logError } from "@/lib/logger";
import { formatFecha } from "@/lib/fechas";
import { consultaCvsDisponibles, conUrlsFirmadas, type CvVista } from "@/lib/cvs";
import {
  ESTILO_INVITACION,
  esEstadoInvitacion,
  type EstadoInvitacion,
} from "@/lib/invitaciones";
import type { FilaMiInvitacion } from "@/types/db";
import { cn } from "@/lib/utils";
import { InvitacionAcciones } from "./invitacion-acciones";

/** Cuántas respondidas o vencidas se muestran en el historial. */
const HISTORIAL_MAXIMO = 20;

/**
 * Invitaciones de la Oficina de Empleo a postularse (migration_056): las
 * pendientes arriba con "Me interesa" / "No me interesa" y las respondidas o
 * vencidas en un historial plegable.
 */
export async function SeccionInvitaciones({ usuarioId }: { usuarioId: string }) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("mis_invitaciones");

  if (error) {
    const ref = logError("mis_invitaciones", error);
    return (
      <ErrorListado
        mensaje="No pudimos cargar tus invitaciones. Intentá de nuevo en unos minutos."
        refError={ref}
      />
    );
  }

  const invitaciones: FilaMiInvitacion[] = data ?? [];
  if (invitaciones.length === 0) {
    return (
      <EstadoVacio tipo="sin-registros" icono={Mail} titulo="No tenés invitaciones por ahora." />
    );
  }

  const pendientes = invitaciones.filter((i) => i.estado === "pendiente");
  const historial = invitaciones.filter((i) => i.estado !== "pendiente");

  let cvs: CvVista[] = [];
  if (pendientes.length > 0) {
    const { data: filasCv, error: errorCvs } = await consultaCvsDisponibles(supabase, usuarioId);
    if (errorCvs) logError("mis_invitaciones:cvs", errorCvs);
    cvs = await conUrlsFirmadas(supabase, filasCv ?? [], 600);
  }

  return (
    <div>
      {pendientes.length > 0 ? (
        <ul className="space-y-3">
          {pendientes.map((inv) => (
            <li
              key={inv.id}
              className="rounded-[var(--radius-lg)] border border-primary/30 bg-surface p-4 shadow-xs sm:p-5"
            >
              <p className="text-xs font-medium text-muted-foreground">
                Te invitamos el {formatFecha(inv.creada_en)}
              </p>
              <h3 className="mt-1 text-base font-semibold text-foreground">
                <Link
                  href={`/ofertas/${inv.oferta_id}`}
                  className="underline-offset-2 hover:text-primary hover:underline"
                >
                  {inv.oferta_titulo}
                </Link>
              </h3>
              {inv.empresa_nombre && (
                <p className="text-sm text-muted-foreground-strong">{inv.empresa_nombre}</p>
              )}
              <Link
                href={`/ofertas/${inv.oferta_id}`}
                className="mt-1 inline-flex min-h-11 items-center text-sm font-medium text-primary underline-offset-2 hover:underline sm:min-h-0"
              >
                Ver la oferta
              </Link>
              <div className="mt-3">
                <InvitacionAcciones
                  invitacionId={inv.id}
                  ofertaTitulo={inv.oferta_titulo}
                  empresaNombre={inv.empresa_nombre}
                  cvs={cvs}
                />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-[var(--radius-lg)] border border-dashed border-border bg-surface px-4 py-6 text-center text-sm text-muted-foreground">
          No tenés invitaciones pendientes.
        </p>
      )}

      {historial.length > 0 && (
        <details className="group mt-4 rounded-[var(--radius-lg)] border border-border bg-surface">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-4 py-2 text-sm font-medium text-foreground [&::-webkit-details-marker]:hidden">
            Invitaciones anteriores ({historial.length})
            <ChevronDown
              className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180 motion-reduce:transition-none"
              aria-hidden="true"
            />
          </summary>
          <ul className="divide-y divide-border border-t border-border">
            {historial.slice(0, HISTORIAL_MAXIMO).map((inv) => (
              <li key={inv.id} className="px-4 py-3">
                <p className="text-sm font-medium text-foreground">
                  {inv.oferta_disponible ? (
                    <Link
                      href={`/ofertas/${inv.oferta_id}`}
                      className="underline-offset-2 hover:text-primary hover:underline"
                    >
                      {inv.oferta_titulo}
                    </Link>
                  ) : (
                    inv.oferta_titulo
                  )}
                  {inv.empresa_nombre && (
                    <span className="font-normal text-muted-foreground"> · {inv.empresa_nombre}</span>
                  )}
                </p>
                <EstadoMiInvitacion invitacion={inv} />
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function EstadoMiInvitacion({ invitacion }: { invitacion: FilaMiInvitacion }) {
  const estado: EstadoInvitacion = esEstadoInvitacion(invitacion.estado)
    ? invitacion.estado
    : "vencida";
  const texto =
    estado === "aceptada"
      ? `Te postulaste el ${formatFecha(invitacion.respondida_en)}`
      : estado === "rechazada"
        ? `Respondiste que no te interesa el ${formatFecha(invitacion.respondida_en)}`
        : `La oferta se cerró el ${formatFecha(invitacion.vencida_en)}`;

  return (
    <p className="mt-1">
      <span
        className={cn(
          "inline-flex max-w-full items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
          ESTILO_INVITACION[estado],
        )}
      >
        {texto}
      </span>
    </p>
  );
}
