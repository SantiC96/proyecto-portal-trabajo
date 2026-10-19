import { notFound } from "next/navigation";
import Link from "next/link";
import { Building, MapPin, Clock, Briefcase } from "lucide-react";
import { PublicFooter } from "@/components/public/public-footer";
import { getOfertaById } from "@/lib/ofertas";
import { formatFecha } from "@/lib/fechas";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { obtenerPostulanteActual, obtenerUsuarioActual } from "@/lib/auth";
import { PostularseCta, type Postulacion } from "./postularse-cta";
import { RequisitosList, BeneficiosList } from "@/components/ofertas/requisitos-beneficios";
import { estadoVencimiento } from "@/lib/ofertas-vencimiento";
import { BotonVolver } from "@/components/ui/boton-volver";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function OfertaDetallePage({ params, searchParams }: Props) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);

  const oferta = await getOfertaById(id);
  if (!oferta) notFound();

  // Una oferta vencida sigue en estado 'activa' (no hay cron): se muestra, pero
  // sin el formulario para postularse.
  const { vencida } = estadoVencimiento("activa", oferta.venceEn ?? null);

  // Determine who is viewing and build the CTA props
  const user = await obtenerUsuarioActual();

  const loginHref = `/auth/login?redirect=${encodeURIComponent(`/ofertas/${oferta.id}?accion=postular`)}`;

  let ctaVariant: "sin-sesion" | "puede-postularse" | "sin-cv" | "ya-postulado" | "otro-rol" =
    "sin-sesion";
  let cvNombre: string | undefined;
  let postulacion: Postulacion | undefined;
  let autoOpen = false;

  if (user) {
    const rol = user.perfil?.rol ?? null;

    if (rol === "empresa" || rol === "municipalidad") {
      ctaVariant = "otro-rol";
    } else if (rol === "postulante") {
      const postulante = await obtenerPostulanteActual();

      if (postulante) {
        const supabase = await createSupabaseServerClient();
        // Parallel: check existing application, check CV
        const [postulacionResult, cvResult] = await Promise.all([
          supabase
            .from("postulaciones")
            .select("id, estado, created_at")
            .eq("oferta_id", oferta.id)
            .eq("postulante_id", postulante.id)
            .maybeSingle(),
          supabase
            .from("archivos_usuario")
            .select("nombre_original")
            .eq("usuario_id", user.id)
            .eq("tipo", "cv")
            .eq("activo", true)
            .maybeSingle(),
        ]);

        if (postulacionResult.data) {
          ctaVariant = "ya-postulado";
          postulacion = postulacionResult.data;
        } else if (!cvResult.data) {
          ctaVariant = "sin-cv";
        } else {
          ctaVariant = "puede-postularse";
          cvNombre = cvResult.data.nombre_original;
          autoOpen = sp.accion === "postular";
        }
      }
    }
  }

  const formattedDate = formatFecha(oferta.fechaPublicacion);

  return (
    <>
      <main className="flex-1 px-4 py-8 sm:px-6 sm:py-12">
        <div className="mx-auto max-w-3xl">
          <BotonVolver href="/ofertas">Volver a ofertas</BotonVolver>

          {/* Card */}
          <article className="mt-6 rounded-2xl border border-border bg-white p-6 shadow-xs sm:p-8">
            {/* Top badges row */}
            <div className="flex flex-wrap items-center gap-2">
              {oferta.categorias.map((cat) => (
                <span
                  key={cat}
                  className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary"
                >
                  <Briefcase className="h-3 w-3" />
                  {cat}
                </span>
              ))}
              <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                Publicado el {formattedDate}
              </span>
            </div>

            {/* Title */}
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {oferta.titulo}
            </h1>

            {/* Company & location */}
            <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted-foreground-strong">
              <span className="inline-flex items-center gap-1.5 font-medium">
                <Building className="h-4 w-4 shrink-0 text-muted-foreground" />
                {oferta.empresa}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4 shrink-0 text-primary" />
                {oferta.ubicacion}
              </span>
            </div>

            {/* Modalidad & jornada */}
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded-md bg-gray-100 px-2.5 py-1 font-medium text-muted-foreground-strong">
                {oferta.modalidad}
              </span>
              <span className="rounded-md bg-gray-100 px-2.5 py-1 font-medium text-muted-foreground-strong">
                {oferta.jornada}
              </span>
            </div>

            <hr className="my-6 border-border/60" />

            {/* Description */}
            <section>
              <h2 className="text-sm font-bold uppercase tracking-wider text-primary">
                Descripción del puesto
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground-strong">{oferta.descripcion}</p>
            </section>

            <RequisitosList items={oferta.requisitos} />
            <BeneficiosList items={oferta.beneficios ?? []} />

            <hr className="my-6 border-border/60" />

            {/* CTA */}
            {vencida ? (
              <div
                role="status"
                className="rounded-[var(--radius-md)] border border-border bg-surface-tinted px-4 py-3 text-sm text-muted-foreground-strong"
              >
                <p className="font-semibold text-foreground">Esta oferta ya no está disponible</p>
                <p className="mt-1">
                  {ctaVariant === "ya-postulado"
                    ? "Ya no recibe postulaciones nuevas. Podés seguir el estado de la tuya en "
                    : "Ya no recibe postulaciones. Mirá las otras ofertas del "}
                  <Link
                    href={ctaVariant === "ya-postulado" ? "/mis-postulaciones" : "/ofertas"}
                    className="font-medium text-primary underline-offset-2 hover:underline"
                  >
                    {ctaVariant === "ya-postulado" ? "Mis postulaciones" : "portal de empleo"}
                  </Link>
                  .
                </p>
              </div>
            ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                Las postulaciones son revisadas por el equipo de intermediación laboral municipal.
              </p>
              <PostularseCta
                variant={ctaVariant}
                ofertaId={oferta.id}
                ofertaTitulo={oferta.titulo}
                ofertaEmpresa={oferta.empresa}
                loginHref={loginHref}
                cvNombre={cvNombre}
                postulacion={postulacion}
                autoOpen={autoOpen}
              />
            </div>
            )}
          </article>
        </div>
      </main>

      <PublicFooter />
    </>
  );
}
