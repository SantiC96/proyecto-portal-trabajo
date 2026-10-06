import Link from "next/link";
import { OfertaLaboral } from "@/types/oferta";
import { MapPin, Building, Clock, Briefcase, ArrowRight } from "lucide-react";

interface JobCardProps {
  oferta: OfertaLaboral;
}

export function JobCard({ oferta }: JobCardProps) {
  const formattedDate = new Date(oferta.fechaPublicacion).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
  });

  return (
    <Link
      href={`/ofertas/${oferta.id}`}
      aria-label={`${oferta.titulo} — ${oferta.empresa}`}
      className="group block h-full rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
    >
      <article className="flex h-full flex-col rounded-2xl border border-border bg-white p-5 shadow-xs transition-all duration-200 cursor-pointer hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">

        {/* Rubro (truncable) + fecha (sin corte) — una sola línea */}
        <div className="flex items-center justify-between gap-2 overflow-hidden">
          <span
            className="inline-flex min-w-0 shrink items-center gap-1 overflow-hidden rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary"
            title={oferta.rubro}
          >
            <Briefcase className="h-3 w-3 shrink-0" />
            <span className="truncate">{oferta.rubro}</span>
          </span>
          <div className="flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>Publicado el {formattedDate}</span>
          </div>
        </div>

        {/* Título */}
        <h3
          className="mt-3 line-clamp-2 text-lg font-bold text-foreground transition-colors group-hover:text-primary"
          title={oferta.titulo}
        >
          {oferta.titulo}
        </h3>

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
          <span className="shrink-0 whitespace-nowrap rounded-md bg-gray-100 px-2.5 py-1 font-medium text-muted-foreground-strong">
            {oferta.modalidad}
          </span>
          <span className="shrink-0 whitespace-nowrap rounded-md bg-gray-100 px-2.5 py-1 font-medium text-muted-foreground-strong">
            {oferta.jornada}
          </span>
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

        {/* Footer — pegado al fondo, con separación mínima garantizada */}
        <div className="mt-auto pt-5">
          <div className="flex items-center justify-end gap-1 border-t border-border/60 pt-4">
            <span className="text-sm font-medium text-primary">Ver oferta</span>
            <ArrowRight className="h-4 w-4 text-primary" />
          </div>
        </div>
      </article>
    </Link>
  );
}
