import { Hero } from "@/components/public/hero";
import { JobDirectory } from "@/components/public/job-directory";
import { HowItWorks } from "@/components/public/how-it-works";
import { PublicFooter } from "@/components/public/public-footer";
import { getCategorias, leerFiltrosOfertasPublicas } from "@/lib/ofertas";
import { obtenerSesionActual } from "@/lib/sesion";
import { SesionActivaLanding } from "@/components/auth/sesion-activa-landing";
import type { Rol } from "@/types/db";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{
    aviso?: string;
    redirectTo?: string;
    accion?: string;
    q?: string;
    categoria?: string;
    modalidad?: string;
    pagina?: string;
  }>;
}) {
  const params = await searchParams;

  const categorias = await getCategorias();
  const filtros = leerFiltrosOfertasPublicas(params, categorias);

  let sesionAviso: {
    nombre: string;
    rol: Rol | null;
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
        <JobDirectory
          ruta="/"
          searchParams={params}
          categorias={categorias}
          filtros={filtros}
        />
        <HowItWorks />
      </main>

      <PublicFooter />
    </>
  );
}
