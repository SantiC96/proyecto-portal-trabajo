import type { Metadata } from "next";
import { requerirRolPagina } from "@/lib/auth";
import { rutaNotificaciones } from "@/lib/notificaciones";
import { PaginaNotificaciones } from "@/components/notificaciones/pagina-notificaciones";

export const metadata: Metadata = {
  title: "Notificaciones | Portal de Empleo Funes",
};

export default async function NotificacionesPostulantePage({
  searchParams,
}: {
  searchParams: Promise<{ pagina?: string }>;
}) {
  const sp = await searchParams;
  const user = await requerirRolPagina("postulante", { siNoCorresponde: "panel" });

  return (
    <PaginaNotificaciones
      usuarioId={user.id}
      ruta={rutaNotificaciones("postulante")}
      panel={{ href: "/perfil", label: "Mi perfil" }}
      textoVacio="Te avisamos acá cuando deriven tu postulación, te coordinen una entrevista o te asignen un curso."
      searchParams={sp}
    />
  );
}
