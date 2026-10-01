import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Building, MapPin, Clock, Briefcase, Sparkles, LogIn } from "lucide-react";
import { Navbar } from "@/components/public/navbar";
import { PublicFooter } from "@/components/public/public-footer";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getOfertaById } from "@/lib/ofertas";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function OfertaDetallePage({ params }: Props) {
  const { id } = await params;

  const [supabase, oferta] = await Promise.all([
    createSupabaseServerClient(),
    getOfertaById(id),
  ]);

  if (!oferta) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const session = user
    ? {
        nombre: (user.user_metadata?.nombre as string) ?? "",
        apellido: (user.user_metadata?.apellido as string) ?? "",
      }
    : null;

  const formattedDate = new Date(oferta.fechaPublicacion).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="flex min-h-screen flex-col bg-[#f8f8f4] text-[#1b2926]">
      <Navbar session={session} />

      <main className="flex-1 px-4 py-8 sm:px-6 sm:py-12">
        <div className="mx-auto max-w-3xl">
          {/* Back link */}
          <Link
            href="/ofertas"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#4f5a54] transition hover:text-[#0f5b53]"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a ofertas
          </Link>

          {/* Card */}
          <article className="mt-6 rounded-2xl border border-[#d8ddd7] bg-white p-6 shadow-xs sm:p-8">
            {/* Top badges row */}
            <div className="flex flex-wrap items-center gap-2">
              {oferta.rubro && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#0f5b53]/10 px-2.5 py-1 text-xs font-semibold text-[#0f5b53]">
                  <Briefcase className="h-3 w-3" />
                  {oferta.rubro}
                </span>
              )}
              {oferta.destacada && (
                <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                  <Sparkles className="h-3 w-3 fill-amber-500 text-amber-500" />
                  Destacada
                </span>
              )}
              <span className="ml-auto flex items-center gap-1 text-xs text-[#6e7772]">
                <Clock className="h-3.5 w-3.5" />
                Publicado el {formattedDate}
              </span>
            </div>

            {/* Title */}
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-[#1b2926] sm:text-3xl">
              {oferta.titulo}
            </h1>

            {/* Company & location */}
            <div className="mt-3 flex flex-wrap gap-3 text-sm text-[#4f5a54]">
              <span className="inline-flex items-center gap-1.5 font-medium">
                <Building className="h-4 w-4 shrink-0 text-[#6e7772]" />
                {oferta.empresa}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4 shrink-0 text-[#0f5b53]" />
                {oferta.ubicacion}
              </span>
            </div>

            {/* Modalidad & jornada */}
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded-md bg-gray-100 px-2.5 py-1 font-medium text-[#4f5a54]">
                {oferta.modalidad}
              </span>
              <span className="rounded-md bg-gray-100 px-2.5 py-1 font-medium text-[#4f5a54]">
                {oferta.jornada}
              </span>
            </div>

            <hr className="my-6 border-[#d8ddd7]/60" />

            {/* Description */}
            <section>
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#0f5b53]">
                Descripción del puesto
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-[#4f5a54]">{oferta.descripcion}</p>
            </section>

            {/* Requirements */}
            {oferta.requisitos.length > 0 && (
              <section className="mt-6">
                <h2 className="text-sm font-bold uppercase tracking-wider text-[#0f5b53]">
                  Requisitos
                </h2>
                <ul className="mt-3 flex flex-col gap-2">
                  {oferta.requisitos.map((req, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-[#4f5a54]">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0f5b53]" />
                      {req}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Benefits */}
            {oferta.beneficios && oferta.beneficios.length > 0 && (
              <section className="mt-6">
                <h2 className="text-sm font-bold uppercase tracking-wider text-[#0f5b53]">
                  Beneficios
                </h2>
                <ul className="mt-3 flex flex-col gap-2">
                  {oferta.beneficios.map((ben, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-[#4f5a54]">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                      {ben}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <hr className="my-6 border-[#d8ddd7]/60" />

            {/* CTA */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-[#6e7772]">
                Las postulaciones son revisadas por el equipo de intermediación laboral municipal.
              </p>
              <Link
                href={`/auth/login?redirect=${encodeURIComponent(`/ofertas/${oferta.id}?accion=postular`)}`}
                className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#0f5b53] px-5 text-sm font-semibold text-white shadow-xs transition hover:bg-[#093e39]"
              >
                <LogIn className="h-4 w-4" />
                Postularme
              </Link>
            </div>
          </article>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
