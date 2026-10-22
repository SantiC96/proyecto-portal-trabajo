import Link from "next/link";
import { OfertaLaboral } from "@/types/oferta";
import { MapPin, Building, Clock, Briefcase, ArrowRight, UserSearch } from "lucide-react";
import { formatFechaDiaMes } from "@/lib/fechas";
import { cn } from "@/lib/utils";
import { EtiquetaRubro } from "@/components/ui/etiqueta-rubro";

interface JobCardProps {
  oferta: OfertaLaboral;
  /** Solo la oficina: link a la búsqueda de postulantes para esta oferta. */
  hrefBuscarPostulantes?: string | null;
}

const CLASE_TARJETA =
  "tarjeta tarjeta-clickeable flex h-full cursor-pointer flex-col p-5";

const CLASE_TITULO =
  "mt-3 line-clamp-2 text-lg font-bold text-foreground transition-colors group-hover:text-primary";

export function JobCard({ oferta, hrefBuscarPostulantes }: JobCardProps) {
  const href = `/ofertas/${oferta.id}`;
  const etiqueta = `${oferta.titulo} — ${oferta.empresa}`;

  const verOferta = (
    <span className="inline-flex items-center gap-1">
      <span className="text-sm font-medium text-primary">Ver oferta</span>
      <ArrowRight className="h-4 w-4 text-primary" />
    </span>
  );

  if (!hrefBuscarPostulantes) {
    return (
      <Link
        href={href}
        aria-label={etiqueta}
        className="group block h-full rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
      >
        <article className={CLASE_TARJETA}>
          <EncabezadoTarjeta oferta={oferta} />
          <h3 className={CLASE_TITULO} title={oferta.titulo}>
            {oferta.titulo}
          </h3>
          <CuerpoTarjeta oferta={oferta} />

          {/* Footer — pegado al fondo, con separación mínima garantizada */}
          <div className="mt-auto pt-5">
            <div className="flex items-center justify-end gap-1 border-t border-border/60 pt-4">
              {verOferta}
            </div>
          </div>
        </article>
      </Link>
    );
  }

  // Con un segundo link la tarjeta no puede ser un solo <a> (no se anidan):
  // el link a la oferta cubre la tarjeta con ::after y el botón queda encima.
  return (
    <article className={cn(CLASE_TARJETA, "group relative")}>
      <EncabezadoTarjeta oferta={oferta} />
      <h3 className={CLASE_TITULO} title={oferta.titulo}>
        <Link
          href={href}
          aria-label={etiqueta}
          className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-primary/40 focus-visible:after:ring-offset-2"
        >
          {oferta.titulo}
        </Link>
      </h3>
      <CuerpoTarjeta oferta={oferta} />

      <div className="mt-auto pt-5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-4">
          <Link
            href={hrefBuscarPostulantes}
            className="btn-secundario relative z-10 inline-flex min-h-11 items-center gap-1.5 px-3 text-sm font-medium"
          >
            <UserSearch className="h-4 w-4 shrink-0" aria-hidden="true" />
            Buscar postulantes
          </Link>
          <span aria-hidden="true">{verOferta}</span>
        </div>
      </div>
    </article>
  );
}

function EncabezadoTarjeta({ oferta }: { oferta: OfertaLaboral }) {
  const formattedDate = formatFechaDiaMes(oferta.fechaPublicacion);

  return (
    <div className="flex items-start justify-between gap-2">
      <div className="flex min-w-0 flex-wrap gap-1.5">
        {oferta.categorias.map((cat) => (
          <span
            key={cat}
            className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary"
            title={cat}
          >
            <Briefcase className="h-3 w-3 shrink-0" />
            <span className="max-w-[120px] truncate">{cat}</span>
          </span>
        ))}
      </div>
      <div className="flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs text-muted-foreground">
        <Clock className="h-3.5 w-3.5" />
        <span>Publicado el {formattedDate}</span>
      </div>
    </div>
  );
}

/** Empresa, pastillas, descripción y requisitos. */
function CuerpoTarjeta({ oferta }: { oferta: OfertaLaboral }) {
  return (
    <>
      {/* Empresa — una línea con truncado */}
      <div className="mt-1 flex items-center gap-1.5 overflow-hidden text-sm font-medium text-muted-foreground-strong">
        <Building className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="truncate" title={oferta.empresa}>{oferta.empresa}</span>
      </div>

      {/* Pastillas: ubicación truncable, modalidad y jornada sin corte — fila única */}
      <div className="mt-3 flex flex-nowrap gap-2 overflow-hidden text-xs">
        <span
          className="inline-flex min-w-0 shrink items-center gap-1 overflow-hidden rounded-md bg-surface-tinted px-2.5 py-1 font-medium text-foreground"
          title={oferta.ubicacion}
        >
          <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
          <span className="truncate">{oferta.ubicacion}</span>
        </span>
        <EtiquetaRubro className="shrink-0 whitespace-nowrap">{oferta.modalidad}</EtiquetaRubro>
        <EtiquetaRubro className="shrink-0 whitespace-nowrap">{oferta.jornada}</EtiquetaRubro>
      </div>

      {/* Descripción */}
      <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
        {oferta.descripcion}
      </p>

      {/* Requisitos — solo se muestra si hay al menos uno */}
      {oferta.requisitos.length > 0 && (
        <div className="mt-4 flex flex-nowrap items-center gap-1.5 overflow-hidden">
          {oferta.requisitos.slice(0, 2).map((req, i) => (
            <span
              key={i}
              className="inline-flex max-w-[8rem] shrink-0 items-center overflow-hidden rounded-md border border-border/80 bg-background px-2 py-0.5 text-[11px] text-muted-foreground-strong"
              title={req}
            >
              <span className="truncate">• {req}</span>
            </span>
          ))}
          {oferta.requisitos.length > 2 && (
            <span className="shrink-0 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] text-muted-foreground">
              +{oferta.requisitos.length - 2} más
            </span>
          )}
        </div>
      )}
    </>
  );
}
