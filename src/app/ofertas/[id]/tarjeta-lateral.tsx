import type { ReactNode } from "react";
import Link from "next/link";
import { CalendarClock, UserSearch } from "lucide-react";
import { Badge, type TonoBadge } from "@/components/ui/badge";
import { RetirarPostulacion } from "@/components/postulantes/retirar-postulacion";
import { InvitacionAcciones } from "@/app/(dashboard)/invitaciones/invitacion-acciones";
import { formatFecha } from "@/lib/fechas";
import type { CvVista } from "@/lib/cvs";
import type { Enum } from "@/types/db";
import { PostularseCta } from "./postularse-cta";

const ESTADO_LABEL: Record<Enum<"estado_postulacion">, string> = {
  recibida: "Recibida",
  en_revision: "En revisión",
  derivada: "Enviada a la empresa",
  rechazada_municipalidad: "No seleccionada",
  oferta_retirada: "Cerrada",
  retirada_postulante: "Retirada",
};

// Mismos tonos que Mis postulaciones (src/lib/mis-postulaciones.ts).
const ESTADO_TONO: Record<Enum<"estado_postulacion">, TonoBadge> = {
  recibida: "neutral",
  en_revision: "info",
  derivada: "teal",
  rechazada_municipalidad: "neutral",
  oferta_retirada: "neutral",
  retirada_postulante: "neutral",
};

const TEXTO_REVISION =
  "Las postulaciones son revisadas por el equipo de intermediación laboral municipal.";

type DatosOferta = { id: string; titulo: string; empresa: string; venceEn: string | null };

export type VarianteLateral =
  | { tipo: "sin-sesion"; loginHref: string }
  | { tipo: "otro-rol" }
  | { tipo: "oficina"; hrefBuscarPostulantes: string | null }
  | { tipo: "cerrada" }
  | { tipo: "puede-postularse"; cvs: CvVista[]; autoOpen: boolean }
  | {
      tipo: "invitado";
      invitacion: { id: string; creadaEn: string };
      cvs: CvVista[];
    }
  | {
      tipo: "ya-postulado";
      postulacion: { id: string; estado: Enum<"estado_postulacion">; createdAt: string };
      /** Nombre del CV con el que se postuló; null en postulaciones anteriores a poder elegirlo. */
      cvNombre: string | null;
      /** Se puede retirar (sePuedeRetirar). */
      puedeRetirar: boolean;
      conPreEntrevista: boolean;
      /** La oferta venció: ya no recibe postulaciones nuevas. */
      vencida: boolean;
    };

/** Tarjeta lateral del detalle de una oferta: qué puede hacer quien la mira. */
export function TarjetaLateral({
  variante,
  oferta,
}: {
  variante: VarianteLateral;
  oferta: DatosOferta;
}) {
  switch (variante.tipo) {
    case "puede-postularse":
      return (
        <Contenedor titulo="¿Te interesa este puesto?">
          <Parrafo>
            Elegís con qué CV postularte. La Oficina de Empleo revisa tu postulación antes de
            enviarla a la empresa.
          </Parrafo>
          <PostularseCta
            ofertaId={oferta.id}
            ofertaTitulo={oferta.titulo}
            ofertaEmpresa={oferta.empresa}
            cvs={variante.cvs}
            autoOpen={variante.autoOpen}
          />
          <Vencimiento venceEn={oferta.venceEn} />
        </Contenedor>
      );

    case "ya-postulado": {
      const { postulacion } = variante;
      return (
        <Contenedor
          titulo="Ya te postulaste"
          badge={
            <Badge tono={ESTADO_TONO[postulacion.estado] ?? "neutral"} estado>
              {ESTADO_LABEL[postulacion.estado] ?? postulacion.estado}
            </Badge>
          }
        >
          <Parrafo>
            Te postulaste el {formatFecha(postulacion.createdAt)}
            {variante.cvNombre ? (
              <>
                {" "}
                con <span className="break-all font-semibold">{variante.cvNombre}</span>
              </>
            ) : null}
            .
          </Parrafo>
          {variante.vencida && <Parrafo>Esta oferta ya no recibe postulaciones nuevas.</Parrafo>}
          <div className="flex flex-col gap-2">
            <Link href="/mis-postulaciones" className="btn-neutro w-full">
              Ver mis postulaciones
            </Link>
            {variante.puedeRetirar && (
              <RetirarPostulacion
                postulacionId={postulacion.id}
                ofertaTitulo={oferta.titulo}
                derivada={postulacion.estado === "derivada"}
                conPreEntrevista={variante.conPreEntrevista}
                className="w-full"
              />
            )}
          </div>
        </Contenedor>
      );
    }

    case "invitado":
      return (
        <Contenedor titulo="Te invitaron" badge={<Badge tono="warning">Invitación</Badge>}>
          <Parrafo>La Oficina de Empleo te propone esta oferta.</Parrafo>
          <p className="text-sm text-muted-foreground">
            Recibida el {formatFecha(variante.invitacion.creadaEn)}
          </p>
          <InvitacionAcciones
            invitacionId={variante.invitacion.id}
            ofertaTitulo={oferta.titulo}
            empresaNombre={oferta.empresa}
            cvs={variante.cvs}
            textoAceptar="Aceptar invitación"
            disposicion="apiladas"
          />
        </Contenedor>
      );

    case "cerrada":
      return (
        <Contenedor titulo="Oferta cerrada" badge={<Badge tono="neutral">Cerrada</Badge>}>
          <Parrafo>Esta oferta ya no recibe postulaciones.</Parrafo>
          <Link href="/ofertas" className="btn-secundario w-full">
            Ver otras ofertas
          </Link>
        </Contenedor>
      );

    case "sin-sesion":
      return (
        <Contenedor titulo="¿Te interesa este puesto?">
          <Parrafo>{TEXTO_REVISION}</Parrafo>
          <Link href={variante.loginHref} className="btn-primario w-full">
            Postularme
          </Link>
          <Vencimiento venceEn={oferta.venceEn} />
        </Contenedor>
      );

    case "otro-rol":
      return (
        <Contenedor>
          <Parrafo>{TEXTO_REVISION}</Parrafo>
          <p className="text-sm text-muted-foreground italic">
            Las postulaciones son exclusivas para postulantes registrados.
          </p>
        </Contenedor>
      );

    case "oficina":
      return (
        <Contenedor>
          <Parrafo>{TEXTO_REVISION}</Parrafo>
          {variante.hrefBuscarPostulantes && (
            <Link href={variante.hrefBuscarPostulantes} className="btn-primario w-full">
              <UserSearch aria-hidden="true" />
              Buscar postulantes
            </Link>
          )}
        </Contenedor>
      );
  }
}

function Contenedor({
  titulo,
  badge,
  children,
}: {
  titulo?: string;
  badge?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={titulo ? "oferta-accion-titulo" : undefined}
      aria-label={titulo ? undefined : "Postulación"}
      className="tarjeta flex flex-col gap-4 px-4 py-[18px] sm:p-6"
    >
      {titulo && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="oferta-accion-titulo" className="text-lg font-extrabold text-heading sm:text-xl">
            {titulo}
          </h2>
          {badge}
        </div>
      )}
      {children}
    </section>
  );
}

function Parrafo({ children }: { children: ReactNode }) {
  return <p className="text-base leading-[1.6] text-texto-parrafo">{children}</p>;
}

function Vencimiento({ venceEn }: { venceEn: string | null }) {
  if (!venceEn) return null;
  return (
    <p className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
      <CalendarClock className="size-4 shrink-0" aria-hidden="true" />
      Vence el {formatFecha(venceEn)}
    </p>
  );
}
