import "server-only";

import { esRutaInterna } from "@/lib/redirect";

const NOMBRE_PORTAL = "Portal de Empleo Funes";
const PIE = "Recibís este correo porque tenés una cuenta en el Portal de Empleo Funes.";

// Los clientes de correo no soportan variables CSS: son los valores de los
// tokens de globals.css (primary, foreground, muted-foreground-strong, background,
// surface, border).
const COLOR = {
  primario: "#006833",
  textoPrimario: "#ffffff",
  texto: "#17241d",
  textoSecundario: "#4f5a54",
  fondo: "#f6f8f6",
  superficie: "#ffffff",
  borde: "#d9e2dc",
} as const;

export type EmailArmado = {
  asunto: string;
  html: string;
  texto: string;
};

function escaparHtml(valor: string): string {
  return valor
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

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

  const boton = url
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 0;">
            <tr>
              <td style="border-radius:8px;background:${COLOR.primario};">
                <a href="${escaparHtml(url)}" style="display:inline-block;padding:12px 20px;font-size:15px;font-weight:600;line-height:20px;color:${COLOR.textoPrimario};text-decoration:none;border-radius:8px;">Ver en el portal</a>
              </td>
            </tr>
          </table>`
    : "";

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${titulo}</title>
</head>
<body style="margin:0;padding:0;background:${COLOR.fondo};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COLOR.fondo};">
    <tr>
      <td align="center" style="padding:24px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:${COLOR.superficie};border:1px solid ${COLOR.borde};border-radius:12px;">
          <tr>
            <td style="padding:24px;font-family:Arial,Helvetica,sans-serif;color:${COLOR.texto};">
              <p style="margin:0 0 16px;font-size:13px;font-weight:700;letter-spacing:.04em;color:${COLOR.primario};">${NOMBRE_PORTAL}</p>
              <h1 style="margin:0 0 12px;font-size:20px;line-height:28px;font-weight:700;color:${COLOR.texto};">${titulo}</h1>
              <p style="margin:0;font-size:15px;line-height:24px;color:${COLOR.texto};">${mensaje}</p>
              ${boton}
            </td>
          </tr>
        </table>
        <p style="max-width:560px;margin:16px auto 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:${COLOR.textoSecundario};">${PIE}</p>
      </td>
    </tr>
  </table>
</body>
</html>`;

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
  ].join("\n");

  return { asunto, html, texto };
}
