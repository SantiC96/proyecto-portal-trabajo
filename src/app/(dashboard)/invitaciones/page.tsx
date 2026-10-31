import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { obtenerPostulanteActual, requerirRolPagina } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { EsqueletoLista } from "@/components/ui/esqueleto";
import { BotonVolver } from "@/components/ui/boton-volver";
import { EncabezadoPagina } from "@/components/ui/encabezado-pagina";
import { SeccionInvitaciones, BajadaInvitaciones, type ConsultaInvitaciones } from "./seccion-invitaciones";

export const metadata: Metadata = {
  title: "Invitaciones | Portal de Empleo Funes",
};

export default async function InvitacionesPage() {
  await requerirRolPagina("postulante");
  const postulante = await obtenerPostulanteActual();
  if (!postulante) redirect("/");

  // Una sola consulta para la bajada del encabezado y el listado.
  const consulta: ConsultaInvitaciones = (async () => {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc("mis_invitaciones");
    return { data: data ?? null, error };
  })();

  return (
    <section className="flex flex-col gap-6">
      <BotonVolver href="/panel" destacado />
      <EncabezadoPagina
        banda
        className="-mt-2"
        titulo="Invitaciones"
        bajada={
          <Suspense fallback={<span className="inline-block h-4 w-64 max-w-full rounded bg-primary-foreground/20" />}>
            <BajadaInvitaciones consulta={consulta} />
          </Suspense>
        }
      />

      <Suspense fallback={<EsqueletoLista filas={3} />}>
        <SeccionInvitaciones consulta={consulta} usuarioId={postulante.usuario_id} />
      </Suspense>
    </section>
  );
}
