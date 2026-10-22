import { Suspense } from "react";
import { Hero } from "@/components/public/hero";
import { HowItWorks } from "@/components/public/how-it-works";
import { UltimasOfertas, EsqueletoUltimasOfertas } from "@/components/public/ultimas-ofertas";
import { TuActividad, EsqueletoTuActividad } from "@/components/public/tu-actividad";
import { ContactoOficina } from "@/components/public/contacto-oficina";
import { getCategorias } from "@/lib/ofertas";
import { obtenerSesionActual } from "@/lib/sesion";
import { esOficinaActiva, obtenerPostulanteActual, obtenerUsuarioActual } from "@/lib/auth";
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
  }>;
}) {
  const params = await searchParams;

  const [categorias, usuario, postulante] = await Promise.all([
    getCategorias(),
    obtenerUsuarioActual(),
    obtenerPostulanteActual(),
  ]);
  const esOficina = esOficinaActiva(usuario);

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
      <main className="flex flex-1 flex-col gap-12">
        <Hero
          nombrePostulante={postulante ? (usuario?.perfil?.nombre.trim() ?? "") : null}
          categorias={categorias}
        />

        <Suspense fallback={<EsqueletoUltimasOfertas />}>
          <UltimasOfertas esOficina={esOficina} esPostulante={postulante !== null} />
        </Suspense>

        {postulante && (
          <Suspense fallback={<EsqueletoTuActividad />}>
            <TuActividad postulanteId={postulante.id} />
          </Suspense>
        )}

        {!usuario && <HowItWorks />}

        <ContactoOficina />
      </main>
    </>
  );
}
