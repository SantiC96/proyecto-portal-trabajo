import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { obtenerPostulanteActual, requerirRolPagina } from "@/lib/auth";
import { EncabezadoPagina } from "@/components/ui/encabezado-pagina";
import {
  AccionesPanel,
  AvisoInvitaciones,
  BloqueIndicadores,
  BloqueMovimientos,
  BloqueOfertas,
  BloquePerfil,
} from "./bloques";
import {
  ColumnasPanel,
  EsqueletoIndicadores,
  EsqueletoMovimientos,
  EsqueletoOfertas,
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
    <div className="flex flex-col gap-7">
      <EncabezadoPagina
        titulo={nombre ? `Hola, ${nombre}` : "Hola"}
        bajada="Este es el resumen de tus postulaciones."
        acciones={<AccionesPanel />}
      />

      <Suspense fallback={<EsqueletoIndicadores />}>
        <BloqueIndicadores />
      </Suspense>

      <Suspense fallback={null}>
        <AvisoInvitaciones />
      </Suspense>

      <ColumnasPanel>
        <Suspense fallback={<EsqueletoMovimientos />}>
          <BloqueMovimientos postulanteId={postulante.id} />
        </Suspense>
        <Suspense fallback={<EsqueletoPerfil />}>
          <BloquePerfil />
        </Suspense>
      </ColumnasPanel>

      <Suspense fallback={<EsqueletoOfertas />}>
        <BloqueOfertas />
      </Suspense>
    </div>
  );
}
