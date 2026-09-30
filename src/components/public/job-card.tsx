import Link from "next/link";
import { OfertaLaboral } from "@/types/oferta";
import { MapPin, Building, Clock, Briefcase, Sparkles, ArrowRight } from "lucide-react";

interface JobCardProps {
  oferta: OfertaLaboral;
  onApply: (oferta: OfertaLaboral) => void;
}

export function JobCard({ oferta, onApply }: JobCardProps) {
  // Format publication date
  const formattedDate = new Date(oferta.fechaPublicacion).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
  });

  return (
    <article className="group flex flex-col justify-between rounded-2xl border border-[#d8ddd7] bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-[#0f5b53]/50 hover:shadow-md">
      <div>
        {/* Top Badges */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-[#0f5b53]/10 px-2.5 py-1 text-xs font-semibold text-[#0f5b53]">
            <Briefcase className="h-3 w-3" />
            {oferta.rubro}
          </span>
          <div className="flex items-center gap-1.5 text-xs text-[#6e7772]">
            <Clock className="h-3.5 w-3.5" />
            <span>Publicado el {formattedDate}</span>
          </div>
        </div>

        {/* Title & Company */}
        <div className="mt-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-lg font-bold text-[#1b2926] group-hover:text-[#0f5b53] transition-colors">
              <Link href={`/ofertas/${oferta.id}`}>{oferta.titulo}</Link>
            </h3>
            {oferta.destacada && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                <Sparkles className="h-3 w-3 fill-amber-500 text-amber-500" />
                Destacada
              </span>
            )}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-sm font-medium text-[#4f5a54]">
            <Building className="h-4 w-4 shrink-0 text-[#6e7772]" />
            <span>{oferta.empresa}</span>
          </div>
        </div>

        {/* Location & Modality Pills */}
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className="inline-flex items-center gap-1 rounded-md bg-[#f0f4f1] px-2.5 py-1 font-medium text-[#1b2926]">
            <MapPin className="h-3.5 w-3.5 text-[#0f5b53]" />
            {oferta.ubicacion}
          </span>
          <span className="rounded-md bg-gray-100 px-2.5 py-1 font-medium text-[#4f5a54]">
            {oferta.modalidad}
          </span>
          <span className="rounded-md bg-gray-100 px-2.5 py-1 font-medium text-[#4f5a54]">
            {oferta.jornada}
          </span>
        </div>

        {/* Description Excerpt */}
        <p className="mt-3 line-clamp-2 text-sm text-[#6e7772] leading-relaxed">
          {oferta.descripcion}
        </p>

        {/* Key Requirements preview */}
        {oferta.requisitos.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {oferta.requisitos.slice(0, 2).map((req, i) => (
              <span
                key={i}
                className="inline-block max-w-full truncate rounded-md border border-[#d8ddd7]/80 bg-[#f8f8f4] px-2 py-0.5 text-[11px] text-[#4f5a54]"
                title={req}
              >
                • {req}
              </span>
            ))}
            {oferta.requisitos.length > 2 && (
              <span className="rounded-md px-1.5 py-0.5 text-[11px] text-[#6e7772]">
                +{oferta.requisitos.length - 2} más
              </span>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex flex-col gap-2 pt-4 border-t border-[#d8ddd7]/60 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href={`/ofertas/${oferta.id}`}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[#d8ddd7] px-3.5 text-xs font-semibold text-[#1b2926] transition hover:border-[#0f5b53] hover:text-[#0f5b53] active:bg-[#f0f4f1]"
        >
          <span>Ver detalle</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
        <button
          type="button"
          onClick={() => onApply(oferta)}
          className="inline-flex h-9 items-center justify-center rounded-lg bg-[#0f5b53] px-4 text-xs font-semibold text-white shadow-xs transition hover:bg-[#093e39] active:translate-y-px"
        >
          Postularme
        </button>
      </div>
    </article>
  );
}
