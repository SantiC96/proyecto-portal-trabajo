import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { obtenerPostulanteActual, requerirRolPagina } from "@/lib/auth";
import { EsqueletoLista } from "@/components/ui/esqueleto";
import { BotonVolver } from "@/components/ui/boton-volver";
import { SeccionInvitaciones } from "./seccion-invitaciones";

export const metadata: Metadata = {
  title: "Invitaciones | Portal de Empleo Funes",
};

export default async function InvitacionesPage() {
  await requerirRolPagina("postulante");
  const postulante = await obtenerPostulanteActual();
  if (!postulante) redirect("/");

  return (
    <section className="px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-3xl space-y-6">
        <BotonVolver href="/perfil">Volver a mi perfil</BotonVolver>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Invitaciones
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            La Oficina de Empleo te propone estas ofertas porque coinciden con tu perfil.
          </p>
        </div>

        <Suspense fallback={<EsqueletoLista filas={3} />}>
          <SeccionInvitaciones usuarioId={postulante.usuario_id} />
        </Suspense>
      </div>
    </section>
  );
}
