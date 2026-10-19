import type { Metadata } from "next";
import { requerirRolPagina } from "@/lib/auth";
import { rutaNotificaciones } from "@/lib/notificaciones";
import { PaginaNotificaciones } from "@/components/notificaciones/pagina-notificaciones";

export const metadata: Metadata = {
  title: "Notificaciones | Panel municipal | Portal de Empleo Funes",
};

export default async function NotificacionesAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ pagina?: string }>;
}) {
  const sp = await searchParams;
  const user = await requerirRolPagina("municipalidad");

  return (
    <PaginaNotificaciones
      usuarioId={user.id}
      ruta={rutaNotificaciones("municipalidad")}
      panel={{ href: "/admin", label: "Volver al panel" }}
      textoVacio="Te avisamos acá de contrataciones, empresas y ofertas para revisar y cursos completados."
      searchParams={sp}
    />
  );
}
