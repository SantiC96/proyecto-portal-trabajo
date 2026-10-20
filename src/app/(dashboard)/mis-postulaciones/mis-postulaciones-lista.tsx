"use client";

import Link from "next/link";
import { CheckCircle, AlertTriangle, CalendarClock } from "lucide-react";
import { retirarPostulacion } from "@/app/(dashboard)/postulaciones/actions";
import { DialogoConfirmacion } from "@/components/ui/dialogo-confirmacion";
import { formatFecha, formatFechaHora } from "@/lib/fechas";
import { getOfertaEstadoBadge } from "@/lib/oferta-estados";
import type { Enum, FilaEstadoDerivacionPostulante, FilaMiPreEntrevista, Tabla } from "@/types/db";

type EstadoPostulacion = Enum<"estado_postulacion">;

export type Postulacion = Pick<Tabla<"postulaciones">, "id" | "estado" | "created_at"> & {
  /** null cuando RLS no deja ver la oferta (por ejemplo, si está cerrada). */
  oferta: Pick<
    Tabla<"ofertas">,
    "id" | "titulo" | "empresa_nombre" | "estado" | "contenido_editado_en"
  > | null;
  derivacion: FilaEstadoDerivacionPostulante | null;
  /** Pre-entrevista con la oficina (sin la nota interna). */
  preEntrevista: FilaMiPreEntrevista | null;
};

function getBadgeEstado(estado: EstadoPostulacion) {
  switch (estado) {
    case "recibida":
      return { label: "Recibida", className: "bg-gray-100 text-gray-700" };
    case "en_revision":
      return { label: "En revisión", className: "bg-amber-100 text-amber-800" };
    case "derivada":
      return { label: "Enviada a la empresa", className: "bg-blue-100 text-blue-800" };
    case "rechazada_municipalidad":
      return { label: "No seleccionada", className: "bg-red-100 text-red-700" };
    case "oferta_retirada":
      return { label: "Cerrada", className: "bg-gray-100 text-gray-600" };
  }
}

const AVISO_OFERTA_RETIRADA =
  "La empresa retiró la oferta. Tu postulación quedó cerrada; podés seguir postulándote a otras ofertas.";

function RetirarBoton({ postulacionId }: { postulacionId: string }) {
  return (
    <DialogoConfirmacion
      textoBoton="Retirar postulación"
      estiloBoton="peligro"
      claseBoton="mt-3"
      titulo="¿Retirar postulación?"
      descripcion="Tu postulación se va a eliminar y la Oficina de Empleo ya no la va a ver. Si cambiás de opinión, podés volver a postularte mientras la oferta siga publicada."
      textoConfirmar="Sí, retirar"
      textoPendiente="Retirando…"
      destructivo
      accion={() => retirarPostulacion(postulacionId)}
    />
  );
}

interface Props {
  postulaciones: Postulacion[];
}

export function MisPostulacionesLista({ postulaciones }: Props) {
  return (
    <div className="flex flex-col gap-4">

      {postulaciones.map((p) => {
        const badge = getBadgeEstado(p.estado);
        const oferta = p.oferta;
        const ofertaActiva = oferta?.estado === "activa";
        const ofertaBadge = getOfertaEstadoBadge(oferta?.estado);
        const fecha = formatFecha(p.created_at);

        // Indicador: la oferta fue editada DESPUÉS de que el postulante se postuló.
        const modificada =
          oferta?.contenido_editado_en != null &&
          oferta.contenido_editado_en > p.created_at;

        return (
          <article
            key={p.id}
            className="rounded-xl border border-border bg-white p-4 shadow-xs sm:p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                {oferta ? (
                  ofertaActiva ? (
                    <Link
                      href={`/ofertas/${oferta.id}`}
                      className="text-base font-semibold text-foreground underline-offset-2 hover:text-primary hover:underline"
                    >
                      {oferta.titulo}
                    </Link>
                  ) : (
                    <span className="text-base font-semibold text-muted-foreground-strong">
                      {oferta.titulo}
                    </span>
                  )
                ) : (
                  <span className="text-base font-semibold text-muted-foreground-strong">
                    Oferta no disponible
                  </span>
                )}
                {oferta && (
                  <p className="mt-0.5 text-sm text-muted-foreground">{oferta.empresa_nombre}</p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {ofertaBadge && (
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ofertaBadge.className}`}
                  >
                    {ofertaBadge.label}
                  </span>
                )}
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}
                >
                  {badge.label}
                </span>
              </div>
            </div>

            {ofertaBadge?.descripcion && (
              <p className="mt-2 text-xs text-amber-700">{ofertaBadge.descripcion}</p>
            )}

            <p className="mt-2 text-xs text-muted-foreground">Postulado el {fecha}</p>

            {(p.estado === "recibida" || p.estado === "en_revision") &&
              p.preEntrevista?.estado === "coordinada" && (
                <div className="mt-3 flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-sm text-blue-800">
                  <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                  <div className="min-w-0">
                    <span className="font-medium">Pre-entrevista con la Oficina de Empleo: </span>
                    {formatFechaHora(p.preEntrevista.fecha_hora)}
                    <span className="mt-0.5 block break-words text-blue-700">
                      {p.preEntrevista.lugar}
                    </span>
                  </div>
                </div>
              )}

            {/* Derivacion: estado de la empresa (nunca notas) */}
            {p.estado === "oferta_retirada" && (
              <p className="mt-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-600">
                {AVISO_OFERTA_RETIRADA}
              </p>
            )}

            {p.estado === "derivada" && p.derivacion && (() => {
              const d = p.derivacion;
              if (d.estado_empresa === "oferta_retirada") {
                return (
                  <p className="mt-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-600">
                    {AVISO_OFERTA_RETIRADA}
                  </p>
                );
              }
              if (d.estado_empresa === "contratado") {
                return (
                  <div className="mt-3 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <span className="font-medium">¡Fuiste seleccionado para este puesto!</span>
                  </div>
                );
              }
              if (d.estado_empresa === "rechazado") {
                return (
                  <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-600">
                    No fuiste seleccionado para este puesto.
                  </div>
                );
              }
              if (d.estado_empresa === "en_proceso" && d.fecha_entrevista) {
                return (
                  <div className="mt-3 flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-sm text-blue-800">
                    <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                    <div>
                      <span className="font-medium">Entrevista coordinada: </span>
                      {formatFechaHora(d.fecha_entrevista)}
                      {d.lugar_entrevista && (
                        <span className="block mt-0.5 text-blue-700">
                          {d.lugar_entrevista}
                        </span>
                      )}
                    </div>
                  </div>
                );
              }
              // estado_empresa === 'pendiente' — empresa aún no contactó
              return (
                <p className="mt-2 text-xs text-muted-foreground">
                  Tu postulación fue derivada a la empresa.
                </p>
              );
            })()}

            {modificada && (
              <div className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                <span>
                  Modificada después de tu postulación
                  {" "}({formatFecha(oferta!.contenido_editado_en!)})
                  {ofertaActiva && (
                    <>
                      {" — "}
                      <Link
                        href={`/ofertas/${oferta!.id}`}
                        className="font-medium text-primary underline-offset-2 hover:underline"
                      >
                        Ver oferta actualizada
                      </Link>
                    </>
                  )}
                </span>
              </div>
            )}

            {p.estado === "recibida" && (
              <RetirarBoton
                postulacionId={p.id}
              />
            )}
          </article>
        );
      })}

      {/* Estado legend */}
      <section className="mt-2 rounded-xl border border-border bg-surface-tinted p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          ¿Qué significa cada estado?
        </p>
        <ul className="flex flex-col gap-1.5 text-xs text-muted-foreground-strong">
          <li>
            <span className="font-medium text-gray-700">Recibida</span>
            {" — "}Tu postulación llegó y está esperando revisión por la Oficina de Empleo.
          </li>
          <li>
            <span className="font-medium text-amber-700">En revisión</span>
            {" — "}La Oficina de Empleo está evaluando tu perfil para esta oferta.
          </li>
          <li>
            <span className="font-medium text-blue-700">Enviada a la empresa</span>
            {" — "}La Oficina de Empleo derivó tu postulación. La empresa te contactará para coordinar una entrevista.
          </li>
          <li>
            <span className="font-medium text-red-700">No seleccionada</span>
            {" — "}La Oficina de Empleo no seleccionó tu perfil para esta búsqueda.
          </li>
        </ul>
      </section>
    </div>
  );
}
