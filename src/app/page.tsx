import { Hero } from "@/components/public/hero";
import { JobDirectory } from "@/components/public/job-directory";
import { HowItWorks } from "@/components/public/how-it-works";
import { PublicFooter } from "@/components/public/public-footer";
import { getCategorias, leerFiltrosOfertasPublicas } from "@/lib/ofertas";
import { obtenerSesionActual } from "@/lib/sesion";
import { SesionActivaLanding } from "@/components/auth/sesion-activa-landing";
import { esRol, rutaInterna, urlLogin } from "@/lib/redirect";
import type { Rol } from "@/types/db";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{
    aviso?: string;
    redirectTo?: string;
    accion?: string;
    rol?: string;
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
    accion: "registro" | "login" | "otro-rol";
    rolesDestino?: Rol[];
    profileHref?: string;
  } | null = null;
  if (params.aviso === "sesion-activa") {
    const sesion = await obtenerSesionActual();
    if (sesion) {
      const accion =
        params.accion === "login" || params.accion === "otro-rol"
          ? params.accion
          : "registro";
      // searchParams ya viene decodificado: decodificar de nuevo rompería los
      // ?redirect= anidados.
      let redirectTo: string;
      if (accion === "otro-rol") {
        // Al cerrar sesión, el login vuelve a la página que pidió otro rol.
        redirectTo = urlLogin(rutaInterna(params.redirectTo, ""));
      } else {
        const porDefecto = accion === "login" ? "/auth/login" : "/auth/registro";
        redirectTo = rutaInterna(params.redirectTo, porDefecto);
      }
      sesionAviso = {
        nombre: sesion.nombre,
        rol: sesion.rol,
        redirectTo,
        accion,
        rolesDestino: (params.rol ?? "").split(",").filter(esRol),
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
          rolesDestino={sesionAviso.rolesDestino}
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
