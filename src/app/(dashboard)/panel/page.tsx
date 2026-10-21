import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { obtenerPostulanteActual, requerirRolPagina } from "@/lib/auth";
import {
  AvisoInvitaciones,
  BloqueIndicadores,
  BloqueMovimientos,
  BloqueOfertas,
  BloquePerfil,
} from "./bloques";
import {
  EsqueletoIndicadores,
  EsqueletoListaBloque,
  EsqueletoPerfil,
} from "./esqueletos";

export const metadata: Metadata = {
  title: "Panel | Portal de Empleo Funes",
};

// Situación actual, sin selector de período (docs/decisiones/029).
export default async function PanelPostulantePage() {
  const usuario = await requerirRolPagina("postulante");
  const postulante = await obtenerPostulanteActual();
  if (!postulante) redirect("/");

  const nombre = usuario.perfil.nombre.trim();

  return (
    <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        {nombre ? `Hola, ${nombre}` : "Hola"}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Mirá cómo van tus postulaciones y qué ofertas coinciden con tu perfil.
      </p>

      <div className="mt-8 flex flex-col gap-8">
        <Suspense fallback={<EsqueletoIndicadores />}>
          <BloqueIndicadores />
        </Suspense>

        <Suspense fallback={null}>
          <AvisoInvitaciones />
        </Suspense>

        <Suspense
          fallback={<EsqueletoListaBloque filas={3} etiqueta="Cargando tus últimos movimientos" />}
        >
          <BloqueMovimientos postulanteId={postulante.id} />
        </Suspense>

        <Suspense fallback={<EsqueletoPerfil />}>
          <BloquePerfil usuario={usuario.perfil} />
        </Suspense>

        <Suspense
          fallback={<EsqueletoListaBloque filas={3} etiqueta="Cargando ofertas para vos" />}
        >
          <BloqueOfertas />
        </Suspense>
      </div>
    </section>
  );
}
