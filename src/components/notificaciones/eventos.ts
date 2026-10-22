// La campanita vive en la navegación (layout raíz) y no se vuelve a renderizar cuando el
// listado marca avisos como leídos en la misma ruta: este evento le avisa que
// vuelva a pedir el contador.
export const EVENTO_NOTIFICACIONES_CAMBIARON = "notificaciones:cambiaron";

export function avisarCambioNotificaciones() {
  window.dispatchEvent(new Event(EVENTO_NOTIFICACIONES_CAMBIARON));
}
