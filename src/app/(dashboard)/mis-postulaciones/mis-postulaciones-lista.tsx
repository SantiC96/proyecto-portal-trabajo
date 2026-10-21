"use client";

import Link from "next/link";
import { CheckCircle, AlertTriangle, CalendarClock, FileText } from "lucide-react";
import { retirarPostulacion } from "@/app/(dashboard)/postulaciones/actions";
import { DialogoConfirmacion } from "@/components/ui/dialogo-confirmacion";
import { formatFecha, formatFechaHora } from "@/lib/fechas";
import { getOfertaEstadoBadge } from "@/lib/oferta-estados";
import {
  AVISO_OFERTA_RETIRADA,
  TEXTO_NO_SELECCIONADO,
  TEXTO_SELECCIONADO,
  anclaPostulacion,
  badgePostulacion,
} from "@/lib/mis-postulaciones";
import type {
  FilaCvDeMiPostulacion,
  FilaEstadoDerivacionPostulante,
  FilaMiPreEntrevista,
  Tabla,
} from "@/types/db";

export type Postulacion = Pick<
  Tabla<"postulaciones">,
  "id" | "estado" | "created_at" | "retirada_en"
> & {
  /** null cuando RLS no deja ver la oferta (por ejemplo, si está cerrada). */
  oferta: Pick<
    Tabla<"ofertas">,
    "id" | "titulo" | "empresa_nombre" | "estado" | "vence_en" | "contenido_editado_en"
  > | null;
  /**
   * Título y empresa cuando RLS no deja leer la oferta (cerrada, vencida,
   * retirada o eliminada), de ofertas_de_mis_postulaciones (migration_059).
   * null si la oferta se puede leer, si ya no existe o si la consulta falló.
   */
  ofertaNoVisible: { titulo: string; empresa_nombre: string | null } | null;
  derivacion: FilaEstadoDerivacionPostulante | null;
  /** Pre-entrevista con la oficina (sin la nota interna). */
  preEntrevista: FilaMiPreEntrevista | null;
  /** CV elegido al postularse; null en postulaciones anteriores a poder elegirlo. */
  cv: FilaCvDeMiPostulacion | null;
  /**
   * Retirada, con la oferta todavía abierta y sin otra postulación vigente a
   * esa oferta: se muestra el link para volver a postularse.
   */
  puedeVolverAPostularse: boolean;
};

/**
 * Se puede retirar mientras el proceso siga abierto: recibida, en revisión o
 * derivada con la empresa todavía sin resultado. Un seleccionado o un proceso
 * cerrado no se retiran (retirar_postulacion, migration_053).
 */
function sePuedeRetirar(p: Postulacion): boolean {
  if (p.estado === "recibida" || p.estado === "en_revision") return true;
  return (
    p.estado === "derivada" &&
    (p.derivacion?.estado_empresa === "pendiente" || p.derivacion?.estado_empresa === "en_proceso")
  );
}

function RetirarBoton({ postulacion }: { postulacion: Postulacion }) {
  const titulo = postulacion.oferta
    ? `¿Retirar tu postulación a «${postulacion.oferta.titulo}»?`
    : "¿Retirar tu postulación?";
  const derivada = postulacion.estado === "derivada";
  const conPreEntrevista = postulacion.preEntrevista?.estado === "coordinada";
  const descripcion = derivada
    ? "La empresa va a recibir un aviso."
    : conPreEntrevista
      ? "Se cancela la pre-entrevista coordinada con la Oficina de Empleo."
      : undefined;

  return (
    <DialogoConfirmacion
      textoBoton="Retirar postulación"
      estiloBoton="peligro"
      claseBoton="mt-3"
      titulo={titulo}
      descripcion={descripcion}
      textoConfirmar="Sí, retirar"
      textoPendiente="Retirando…"
      destructivo
      accion={() => retirarPostulacion(postulacion.id)}
    />
  );
}

/** Sin resultado todavía: recibida, en revisión o derivada sin cierre de la empresa. */
function sigueEnCurso(p: Postulacion): boolean {
  if (p.estado === "recibida" || p.estado === "en_revision") return true;
  if (p.estado !== "derivada") return false;
  const estadoEmpresa = p.derivacion?.estado_empresa;
  return estadoEmpresa == null || estadoEmpresa === "pendiente" || estadoEmpresa === "en_proceso";
}

/**
 * Una oferta en revisión o rechazada no cambia el badge (badgePostulacion):
 * mientras la postulación sigue en curso, se avisa en una línea debajo.
 */
function avisoEstadoOferta(p: Postulacion): string | null {
  if (!p.oferta || !sigueEnCurso(p)) return null;
  if (p.oferta.estado === "pendiente_aprobacion") {
    return getOfertaEstadoBadge(p.oferta.estado)?.descripcion ?? null;
  }
  if (p.oferta.estado === "rechazada") return "La oferta no está publicada en este momento.";
  return null;
}

interface Props {
  postulaciones: Postulacion[];
}

export function MisPostulacionesLista({ postulaciones }: Props) {
  return (
    <div className="flex flex-col gap-4">

      {postulaciones.map((p) => {
        const oferta = p.oferta;
        const badge = badgePostulacion({
          estado: p.estado,
          estadoEmpresa: p.derivacion?.estado_empresa,
          ofertaEstado: oferta?.estado,
          ofertaNoVisible: oferta === null,
        });
        const ofertaActiva = oferta?.estado === "activa";
        const avisoOferta = avisoEstadoOferta(p);
        const fecha = formatFecha(p.created_at);

        // Indicador: la oferta fue editada DESPUÉS de que el postulante se postuló.
        const modificada =
          oferta?.contenido_editado_en != null &&
          oferta.contenido_editado_en > p.created_at;

        return (
          <article
            key={p.id}
            id={anclaPostulacion(p.id)}
            className="scroll-mt-20 rounded-xl border border-border bg-white p-4 shadow-xs sm:p-5"
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
                  // Sin link: la oferta ya no se puede ver y /ofertas/[id] daría 404.
                  <span className="text-base font-semibold text-muted-foreground-strong">
                    {p.ofertaNoVisible?.titulo ?? "Oferta no disponible"}
                  </span>
                )}
                {(oferta?.empresa_nombre || p.ofertaNoVisible?.empresa_nombre) && (
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {oferta?.empresa_nombre || p.ofertaNoVisible?.empresa_nombre}
                  </p>
                )}
              </div>

              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}
              >
                {badge.label}
              </span>
            </div>

            {avisoOferta && <p className="mt-2 text-xs text-amber-700">{avisoOferta}</p>}

            <p className="mt-2 text-xs text-muted-foreground">Postulado el {fecha}</p>

            {p.cv && (
              <p className="mt-1 flex min-w-0 items-start gap-1.5 text-xs text-muted-foreground">
                <FileText className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="min-w-0 break-all">
                  Con el CV{" "}
                  <span className="font-medium text-foreground">{p.cv.nombre_original}</span>{" "}
                  (subido el {formatFecha(p.cv.subido_en)})
                  {p.cv.eliminado && " · lo eliminaste de tu perfil"}
                </span>
              </p>
            )}

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
                    <span className="font-medium">{TEXTO_SELECCIONADO}</span>
                  </div>
                );
              }
              if (d.estado_empresa === "rechazado") {
                return (
                  <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-600">
                    {TEXTO_NO_SELECCIONADO}
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

            {p.estado === "retirada_postulante" && (
              <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
                <p>
                  Retiraste esta postulación
                  {p.retirada_en ? ` el ${formatFecha(p.retirada_en)}` : ""}.
                </p>
                {p.puedeVolverAPostularse && oferta && (
                  <Link
                    href={`/ofertas/${oferta.id}`}
                    className="mt-1 inline-flex min-h-11 items-center font-medium text-primary underline-offset-2 hover:underline"
                  >
                    Volver a postularme
                  </Link>
                )}
              </div>
            )}

            {sePuedeRetirar(p) && <RetirarBoton postulacion={p} />}
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
            <span className="font-medium text-emerald-800">Seleccionado</span>
            {" — "}La empresa te eligió para el puesto.
          </li>
          <li>
            <span className="font-medium text-red-700">No seleccionado</span>
            {" — "}La Oficina de Empleo o la empresa no seleccionaron tu perfil para esta búsqueda.
          </li>
          <li>
            <span className="font-medium text-gray-600">Oferta cerrada</span>
            {" — "}La oferta ya no recibe postulaciones y tu proceso terminó sin un resultado.
          </li>
          <li>
            <span className="font-medium text-slate-600">Retirada</span>
            {" — "}Retiraste tu postulación. Si la oferta sigue abierta, podés volver a postularte.
          </li>
        </ul>
      </section>
    </div>
  );
}
