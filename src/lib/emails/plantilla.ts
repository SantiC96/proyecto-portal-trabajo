import "server-only";

import { esRutaInterna } from "@/lib/redirect";
import {
  PIE_INSTITUCION,
  escaparHtml,
  htmlCorreo,
  textoVistaPrevia,
} from "./diseno";
import { CID_LOGO, LOGO_CORREO_PNG_BASE64 } from "./logo-correo";

const NOMBRE_PORTAL = "Portal de Empleo Funes";
const PIE = "Recibís este correo porque tenés una cuenta en el Portal de Empleo Funes.";

export type EmailArmado = {
  asunto: string;
  html: string;
  texto: string;
};

/** Solo rutas internas ("/mis-postulaciones") sobre la URL pública del portal. */
function urlDelPortal(link: string | null): string | null {
  const base = process.env.NEXT_PUBLIC_SITE_URL;
  if (!base || !esRutaInterna(link)) return null;
  try {
    const url = new URL(link, base);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function armarEmail(datos: {
  titulo: string;
  mensaje: string;
  link: string | null;
}): EmailArmado {
  // Un salto de línea en el asunto permitiría inyectar encabezados.
  const asunto = datos.titulo.replace(/[\r\n]+/g, " ").trim();
  const url = urlDelPortal(datos.link);

  const titulo = escaparHtml(asunto);
  const mensaje = escaparHtml(datos.mensaje.trim()).replace(/\r?\n/g, "<br>");

  // El logo va embebido: transporte.ts lo adjunta con este cid. Sin logo, el
  // encabezado va en texto.
  const logo = LOGO_CORREO_PNG_BASE64 ? `cid:${CID_LOGO}` : null;
  const html = htmlCorreo({
    tituloHtml: titulo,
    mensajeHtml: mensaje,
    url: url ? escaparHtml(url) : null,
    vistaPreviaHtml: escaparHtml(textoVistaPrevia(datos.mensaje)),
    logoUrl: logo ? escaparHtml(logo) : null,
    pieHtml: escaparHtml(PIE),
  });

  const texto = [
    NOMBRE_PORTAL,
    "",
    asunto,
    "",
    datos.mensaje.trim(),
    ...(url ? ["", `Ver en el portal: ${url}`] : []),
    "",
    "--",
    PIE,
    PIE_INSTITUCION,
  ].join("\n");

  return { asunto, html, texto };
}
