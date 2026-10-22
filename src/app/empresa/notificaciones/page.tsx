import type { Metadata } from "next";
import { requerirRolPagina } from "@/lib/auth";
import { rutaNotificaciones } from "@/lib/notificaciones";
import { PaginaNotificaciones } from "@/components/notificaciones/pagina-notificaciones";

export const metadata: Metadata = {
  title: "Notificaciones | Panel de empresa | Portal de Empleo Funes",
};

// Fuera de (panel): una empresa pendiente o rechazada también tiene que poder
// leer sus avisos (por ejemplo, el motivo del rechazo de su solicitud).
export default async function NotificacionesEmpresaPage({
  searchParams,
}: {
  searchParams: Promise<{ pagina?: string }>;
}) {
  const sp = await searchParams;
  const user = await requerirRolPagina("empresa");

  return (
    <>
      <main className="flex-1">
        <PaginaNotificaciones
          usuarioId={user.id}
          ruta={rutaNotificaciones("empresa")}
          panel={{ href: "/empresa", label: "Volver al panel" }}
          textoVacio="Te avisamos acá sobre tu solicitud, la revisión de tus ofertas, los candidatos derivados y los vencimientos."
          searchParams={sp}
        />
      </main>
    </>
  );
}
