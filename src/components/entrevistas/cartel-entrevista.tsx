import type { ReactNode } from "react";
import { CalendarClock } from "lucide-react";
import { Franja } from "@/components/ui/franja";
import { MODALIDAD_LABEL, modalidadDe } from "@/lib/entrevistas";
import { formatFechaHoraLarga } from "@/lib/fechas";
import { cn } from "@/lib/utils";

export type DatosEntrevistaCoordinada = {
  fechaHora: string;
  modalidad: string | null;
  lugar: string | null;
  link: string | null;
};

/** El link de la reunión: se abre en otra pestaña y lo anuncia. */
export function LinkReunion({ href, className }: { href: string; className?: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "break-all rounded-[var(--radius-sm)] outline-none focus-visible:shadow-[var(--sombra-foco)]",
        className,
      )}
    >
      {href}
      <span className="sr-only"> (se abre en otra pestaña)</span>
    </a>
  );
}

/**
 * "Presencial · <lugar>" u "Online · <link>". Para las franjas cortas (Mis
 * postulaciones) y los datos de las fichas.
 */
export function ModalidadYLugar({ datos }: { datos: Omit<DatosEntrevistaCoordinada, "fechaHora"> }) {
  const modalidad = modalidadDe(datos.modalidad);
  return (
    <>
      {MODALIDAD_LABEL[modalidad]}
      {modalidad === "online" && datos.link ? (
        <>
          {" · "}
          <LinkReunion href={datos.link} />
        </>
      ) : datos.lugar ? (
        ` · ${datos.lugar}`
      ) : null}
    </>
  );
}

function Dato({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="inline font-semibold">{etiqueta}: </dt>
      <dd className="inline break-words">{children}</dd>
    </div>
  );
}

type Props = {
  titulo: string;
  datos: DatosEntrevistaCoordinada;
  /** Notas de la entrevista (por ejemplo, la nota interna de la oficina). */
  notas?: { etiqueta: string; texto: string } | null;
  className?: string;
};

/**
 * Cartel "Entrevista coordinada" de las fichas de la oficina y de la empresa:
 * Franja info con la fecha en formato largo ("Martes 3 de noviembre, 10:30
 * h"), la modalidad, el lugar o el link (en otra pestaña) y las notas.
 */
export function CartelEntrevista({ titulo, datos, notas, className }: Props) {
  const modalidad = modalidadDe(datos.modalidad);
  return (
    <Franja tono="info" icono={CalendarClock} className={className}>
      <p className="font-bold">{titulo}</p>
      <dl className="mt-1 flex flex-col gap-0.5">
        <Dato etiqueta="Fecha">{formatFechaHoraLarga(datos.fechaHora)}</Dato>
        <Dato etiqueta="Modalidad">{MODALIDAD_LABEL[modalidad]}</Dato>
        {datos.lugar && <Dato etiqueta="Lugar">{datos.lugar}</Dato>}
        {modalidad === "online" && datos.link && (
          <Dato etiqueta="Link">
            <LinkReunion href={datos.link} />
          </Dato>
        )}
        {notas?.texto && (
          <Dato etiqueta={notas.etiqueta}>
            <span className="whitespace-pre-line">{notas.texto}</span>
          </Dato>
        )}
      </dl>
    </Franja>
  );
}
