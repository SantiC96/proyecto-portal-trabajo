import { Hero } from "@/components/public/hero";
import { JobDirectory } from "@/components/public/job-directory";
import { HowItWorks } from "@/components/public/how-it-works";
import { PublicFooter } from "@/components/public/public-footer";
import { getOfertasActivas, getCategorias } from "@/lib/ofertas";
import { obtenerSesionActual } from "@/lib/sesion";
import { SesionActivaLanding } from "@/components/auth/sesion-activa-landing";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ aviso?: string; redirectTo?: string; accion?: string }>;
}) {
  const params = await searchParams;

  const [ofertas, categorias] = await Promise.all([
    getOfertasActivas(),
    getCategorias(),
  ]);

  let sesionAviso: {
    nombre: string;
    rol: string | null;
    redirectTo: string;
    accion: "registro" | "login";
    profileHref?: string;
  } | null = null;
  if (params.aviso === "sesion-activa") {
    const sesion = await obtenerSesionActual();
    if (sesion) {
      const accion = params.accion === "login" ? "login" : "registro";
      sesionAviso = {
        nombre: sesion.nombre,
        rol: sesion.rol,
        redirectTo: decodeURIComponent(
          params.redirectTo ?? (accion === "login" ? "/auth/login" : "/auth/registro")
        ),
        accion,
        profileHref: sesion.profileHref,
      };
    }
  }

  return (
    <>
      {sesionAviso && (
        <SesionActivaLanding
          nombre={sesionAviso.nombre}
          rol={sesionAviso.rol}
          redirectTo={sesionAviso.redirectTo}
          accion={sesionAviso.accion}
          profileHref={sesionAviso.profileHref}
        />
      )}
      <main className="flex-1">
        <Hero />
        <JobDirectory ofertas={ofertas} categorias={categorias} />
        <HowItWorks />
      </main>

      <PublicFooter />
    </>
  );
}
