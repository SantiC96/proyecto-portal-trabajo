import {
  ContenedorEsqueleto,
  EncabezadoEsqueleto,
  NotificacionesEsqueleto,
} from "@/components/ui/esqueleto";

/** loading.tsx de Notificaciones (los tres roles): la misma forma que PaginaNotificaciones con banda. */
export function CargandoNotificaciones({ volverA }: { volverA: string }) {
  return (
    <ContenedorEsqueleto como="section">
      <EncabezadoEsqueleto volver={volverA} className="mt-4" titulo="Notificaciones" bajadaVariable={7} />
      <NotificacionesEsqueleto className="mt-6" />
    </ContenedorEsqueleto>
  );
}
