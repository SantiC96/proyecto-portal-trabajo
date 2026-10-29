import Link from "next/link";
import { CalendarClock, CalendarDays, ChevronDown, FileText } from "lucide-react";
import { RetirarPostulacion } from "@/components/postulantes/retirar-postulacion";
import { Badge, type TonoBadge } from "@/components/ui/badge";
import { Franja } from "@/components/ui/franja";
import { formatFecha, formatFechaHoraLarga } from "@/lib/fechas";
import { ModalidadYLugar } from "@/components/entrevistas/cartel-entrevista";
import { getOfertaEstadoBadge } from "@/lib/oferta-estados";
import {
  AVISO_OFERTA_RETIRADA,
  TEXTO_NO_SELECCIONADO,
  TEXTO_SELECCIONADO,
  anclaPostulacion,
  badgePostulacion,
  sePuedeRetirar,
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

// Mismos tonos que badgePostulacion (src/lib/mis-postulaciones.ts).
const LEYENDA: { label: string; tono: TonoBadge; texto: string }[] = [
  {
    label: "Recibida",
    tono: "neutral",
    texto: "Tu postulación llegó y está esperando revisión por la Oficina de Empleo.",
  },
  {
    label: "En revisión",
    tono: "info",
    texto: "La Oficina de Empleo está evaluando tu perfil para esta oferta.",
  },
  {
    label: "Enviada a la empresa",
    tono: "teal",
    texto:
      "La Oficina de Empleo derivó tu postulación. La empresa te contactará para coordinar una entrevista.",
  },
  { label: "Seleccionado", tono: "success", texto: "La empresa te eligió para el puesto." },
  {
    label: "No seleccionado",
    tono: "neutral",
    texto: "La Oficina de Empleo o la empresa no seleccionaron tu perfil para esta búsqueda.",
  },
  {
    label: "Oferta cerrada",
    tono: "neutral",
    texto: "La oferta ya no recibe postulaciones y tu proceso terminó sin un resultado.",
  },
  {
    label: "Retirada",
    tono: "neutral",
    texto: "Retiraste tu postulación. Si la oferta sigue abierta, podés volver a postularte.",
  },
];

/** "¿Qué significa cada estado?": plegable, arriba de la lista. */
export function LeyendaEstados() {
  return (
    <details className="group tarjeta">
      <summary className="flex min-h-11 list-none items-center justify-between gap-3 rounded-[var(--radius-xl)] px-4 py-3 text-[15px] font-bold text-heading outline-none focus-visible:shadow-[var(--sombra-foco)] sm:px-6 [&::-webkit-details-marker]:hidden">
        ¿Qué significa cada estado?
        <ChevronDown
          className="size-5 shrink-0 text-muted-foreground transition-transform duration-150 group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <dl className="flex flex-col gap-3 border-t border-border px-4 py-4 sm:px-6">
        {LEYENDA.map((e) => (
          <div key={e.label} className="flex flex-col items-start gap-1.5 sm:flex-row sm:gap-3">
            <dt className="shrink-0 sm:w-48">
              <Badge tono={e.tono} estado>
                {e.label}
              </Badge>
            </dt>
            <dd className="text-[15px] leading-[1.45] text-control-foreground">{e.texto}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

interface Props {
  postulaciones: Postulacion[];
}

export function MisPostulacionesLista({ postulaciones }: Props) {
  return (
    <ul className="flex flex-col gap-3">
      {postulaciones.map((p) => (
        <li key={p.id}>
          <TarjetaPostulacion postulacion={p} />
        </li>
      ))}
    </ul>
  );
}

/** Las aclaraciones de cada postulación miden lo que su texto, sin pasarse del ancho de la tarjeta. */
const CLASE_FRANJA = "w-fit max-w-full";

function TarjetaPostulacion({ postulacion: p }: { postulacion: Postulacion }) {
  const oferta = p.oferta;
  const badge = badgePostulacion({
    estado: p.estado,
    estadoEmpresa: p.derivacion?.estado_empresa,
    ofertaEstado: oferta?.estado,
    ofertaNoVisible: oferta === null,
  });
  const ofertaActiva = oferta?.estado === "activa";
  const avisoOferta = avisoEstadoOferta(p);
  const empresa = oferta?.empresa_nombre || p.ofertaNoVisible?.empresa_nombre;

  // Indicador: la oferta fue editada DESPUÉS de que el postulante se postuló.
  const modificada =
    oferta?.contenido_editado_en != null && oferta.contenido_editado_en > p.created_at;

  const claseTitulo = "text-lg leading-snug font-bold";

  const conPreEntrevista =
    (p.estado === "recibida" || p.estado === "en_revision") &&
    p.preEntrevista?.estado === "coordinada";
  const hayAclaraciones =
    conPreEntrevista ||
    p.estado === "oferta_retirada" ||
    (p.estado === "derivada" && p.derivacion != null) ||
    modificada ||
    p.estado === "retirada_postulante";
  const puedeRetirar = sePuedeRetirar(p.estado, p.derivacion?.estado_empresa);

  return (
    <article
      id={anclaPostulacion(p.id)}
      className="tarjeta flex scroll-mt-20 flex-col gap-3 px-4 py-[18px] sm:p-6"
    >
      <div className="flex flex-col-reverse items-start gap-2 sm:flex-row sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1">
          <h2 className={claseTitulo}>
            {oferta ? (
              ofertaActiva ? (
                <Link
                  href={`/ofertas/${oferta.id}`}
                  className="rounded-[var(--radius-sm)] text-heading underline-offset-2 outline-none hover:text-primary hover:underline focus-visible:shadow-[var(--sombra-foco)]"
                >
                  {oferta.titulo}
                </Link>
              ) : (
                <span className="text-muted-foreground-strong">{oferta.titulo}</span>
              )
            ) : (
              // Sin link: la oferta ya no se puede ver y /ofertas/[id] daría 404.
              <span className="text-muted-foreground-strong">
                {p.ofertaNoVisible?.titulo ?? "Oferta no disponible"}
              </span>
            )}
          </h2>
          {empresa && (
            <p className="mt-0.5 text-[15px] font-semibold text-texto-bajada">{empresa}</p>
          )}
        </div>
        <Badge tono={badge.tono} estado>
          {badge.label}
        </Badge>
      </div>

      {avisoOferta && <p className="text-sm font-semibold text-warning-text">{avisoOferta}</p>}

      <ul className="flex flex-col gap-1.5 text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:gap-x-5">
        <li className="flex items-center gap-1.5">
          <CalendarDays className="size-4 shrink-0" aria-hidden="true" />
          Te postulaste el {formatFecha(p.created_at)}
        </li>
        {p.cv && (
          <li className="flex min-w-0 items-start gap-1.5">
            <FileText className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0 break-all">
              CV enviado: <span className="font-semibold text-foreground">{p.cv.nombre_original}</span>
              {p.cv.eliminado && " · lo eliminaste de tu perfil"}
            </span>
          </li>
        )}
      </ul>

      {(hayAclaraciones || puedeRetirar) && (
        // Aclaraciones a la izquierda y la acción a la derecha, centradas entre
        // sí; en celular, una debajo de la otra con el botón a todo el ancho.
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          {hayAclaraciones && (
            <div className="flex min-w-0 flex-col gap-3">
              {conPreEntrevista && (
                <Franja
                  className={CLASE_FRANJA}
                  tono="info"
                  icono={CalendarClock}
                  titulo="Pre-entrevista con la Oficina de Empleo:"
                >
                  {formatFechaHoraLarga(p.preEntrevista!.fecha_hora)}
                  <span className="mt-0.5 block break-words">
                    <ModalidadYLugar
                      datos={{
                        modalidad: p.preEntrevista!.modalidad,
                        lugar: p.preEntrevista!.lugar,
                        link: p.preEntrevista!.link,
                      }}
                    />
                  </span>
                </Franja>
              )}

              {p.estado === "oferta_retirada" && <Franja className={CLASE_FRANJA} tono="neutra">{AVISO_OFERTA_RETIRADA}</Franja>}

              {p.estado === "derivada" && p.derivacion && <FranjaDerivacion derivacion={p.derivacion} />}

              {modificada && (
                <Franja className={CLASE_FRANJA} tono="aviso" titulo="Modificada después de tu postulación">
                  ({formatFecha(oferta!.contenido_editado_en!)})
                  {ofertaActiva && (
                    <>
                      {" — "}
                      <Link href={`/ofertas/${oferta!.id}`}>Ver oferta actualizada</Link>
                    </>
                  )}
                </Franja>
              )}

              {p.estado === "retirada_postulante" && (
                <Franja className={CLASE_FRANJA} tono="neutra">
                  Retiraste esta postulación
                  {p.retirada_en ? ` el ${formatFecha(p.retirada_en)}` : ""}.
                  {p.puedeVolverAPostularse && oferta && (
                    <Link
                      href={`/ofertas/${oferta.id}`}
                      className="mt-1 flex min-h-11 w-fit items-center text-primary sm:min-h-0"
                    >
                      Volver a postularme
                    </Link>
                  )}
                </Franja>
              )}
            </div>
          )}

          {puedeRetirar && (
            <div className="sm:ml-auto sm:shrink-0">
              <RetirarPostulacion
                postulacionId={p.id}
                ofertaTitulo={oferta?.titulo ?? null}
                derivada={p.estado === "derivada"}
                conPreEntrevista={p.preEntrevista?.estado === "coordinada"}
                className="w-full sm:min-h-10! sm:w-auto"
              />
            </div>
          )}
        </div>
      )}
    </article>
  );
}

/** Resultado de la empresa en una postulación derivada (nunca sus notas). */
function FranjaDerivacion({ derivacion: d }: { derivacion: FilaEstadoDerivacionPostulante }) {
  if (d.estado_empresa === "oferta_retirada") {
    return <Franja className={CLASE_FRANJA} tono="neutra">{AVISO_OFERTA_RETIRADA}</Franja>;
  }
  if (d.estado_empresa === "contratado") {
    return <Franja className={CLASE_FRANJA} tono="ok" titulo={TEXTO_SELECCIONADO} />;
  }
  if (d.estado_empresa === "rechazado") {
    return <Franja className={CLASE_FRANJA} tono="neutra" titulo={TEXTO_NO_SELECCIONADO} />;
  }
  if (d.estado_empresa === "en_proceso" && d.fecha_entrevista) {
    return (
      <Franja className={CLASE_FRANJA} tono="info" icono={CalendarClock} titulo="Entrevista coordinada:">
        {formatFechaHoraLarga(d.fecha_entrevista)}
        <span className="mt-0.5 block break-words">
          <ModalidadYLugar
            datos={{ modalidad: d.modalidad_entrevista, lugar: d.lugar_entrevista, link: d.link_entrevista }}
          />
        </span>
      </Franja>
    );
  }
  // estado_empresa === 'pendiente' — empresa aún no contactó
  return <p className="text-sm text-muted-foreground">Tu postulación fue derivada a la empresa.</p>;
}
