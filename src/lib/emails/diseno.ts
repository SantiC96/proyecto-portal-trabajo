// Diseño de los correos del portal. Lo usan armarEmail (plantilla.ts) y el
// script que genera las plantillas de Supabase (docs/emails/supabase), así
// los dos tienen el mismo HTML. Sin imports: el script lo carga con Node.
//
// Reglas de compatibilidad (decisión 034): tablas con role="presentation",
// estilos en línea, una sola media query para pantallas angostas, sin
// imágenes de fondo ni SVG, y el logo con una URL absoluta.

// Los clientes de correo no soportan variables CSS: son los valores de los
// tokens de globals.css.
export const COLOR = {
  primario: "#006833", // primary
  textoPrimario: "#ffffff", // primary-foreground
  texto: "#17251d", // foreground
  textoSecundario: "#55665c", // muted-foreground
  fondo: "#f4f7f5", // background
  superficie: "#ffffff", // surface
  borde: "#dde5e0", // border
  marcaSuave: "#d7ebdf", // login-suave
} as const;

const LETRA = "'Public Sans',Arial,Helvetica,sans-serif";
const LETRA_TITULO = "Georgia,'Times New Roman',serif";
const FUENTE_GOOGLE =
  "https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;700&display=swap";

export const PIE_INSTITUCION = "Municipalidad de Funes · Oficina de Empleo";
export const TEXTO_BOTON = "Ver en el portal";

export function escaparHtml(valor: string): string {
  return valor
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Texto de la vista previa: el comienzo del mensaje, en una línea. */
export function textoVistaPrevia(mensaje: string, largo = 140): string {
  const plano = mensaje.replace(/\s+/g, " ").trim();
  return plano.length > largo ? `${plano.slice(0, largo - 1).trimEnd()}…` : plano;
}

/**
 * Todos los valores llegan ya escapados (o son constantes del código): esta
 * función no escapa nada. `url` es el destino del botón y del link visible;
 * sin `url` no hay botón. Sin `logoUrl`, el encabezado muestra el nombre de
 * la Municipalidad en texto.
 */
export function htmlCorreo(datos: {
  tituloHtml: string;
  mensajeHtml: string;
  url: string | null;
  textoBotonHtml?: string;
  /** Línea chica debajo del link ("Si no pediste esto…", el vencimiento). */
  notaHtml?: string | null;
  vistaPreviaHtml: string;
  logoUrl: string | null;
  pieHtml: string;
}): string {
  const {
    tituloHtml,
    mensajeHtml,
    url,
    textoBotonHtml = TEXTO_BOTON,
    notaHtml,
    vistaPreviaHtml,
    logoUrl,
    pieHtml,
  } = datos;

  const marca = logoUrl
    ? `<img src="${logoUrl}" width="150" height="42" alt="Municipalidad de Funes" style="display:block;width:150px;max-width:150px;height:auto;border:0;outline:none;text-decoration:none;color:${COLOR.textoPrimario};font-family:${LETRA};font-size:18px;font-weight:700;">`
    : `<p style="margin:0;font-family:${LETRA};font-size:20px;line-height:26px;font-weight:700;color:${COLOR.textoPrimario};">Municipalidad de Funes</p>`;

  const boton = url
    ? `
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 0;border-collapse:separate;">
                <tr>
                  <td align="center" bgcolor="${COLOR.primario}" style="border-radius:12px;background-color:${COLOR.primario};">
                    <a href="${url}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:${LETRA};font-size:16px;line-height:20px;font-weight:700;color:${COLOR.textoPrimario};text-decoration:none;border-radius:12px;">${textoBotonHtml}</a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;font-family:${LETRA};font-size:13px;line-height:20px;color:${COLOR.textoSecundario};">Si el botón no funciona, copiá este link:<br><a href="${url}" target="_blank" style="color:${COLOR.primario};text-decoration:underline;word-break:break-all;">${url}</a></p>`
    : "";

  const nota = notaHtml
    ? `
              <p style="margin:16px 0 0;font-family:${LETRA};font-size:13px;line-height:20px;color:${COLOR.textoSecundario};">${notaHtml}</p>`
    : "";

  // Relleno invisible después de la vista previa: evita que el cliente de
  // correo complete el resumen con el texto del cuerpo.
  const relleno = "&#847;&zwnj;&nbsp;".repeat(60);

  return `<!doctype html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${tituloHtml}</title>
<link href="${FUENTE_GOOGLE}" rel="stylesheet">
<style>
  :root { color-scheme: light; supported-color-schemes: light; }
  @media only screen and (max-width: 599px) {
    .correo-margen { padding: 16px 12px !important; }
    .correo-encabezado { padding: 20px 24px !important; }
    .correo-cuerpo { padding: 24px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:${COLOR.fondo};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;color:${COLOR.fondo};">${vistaPreviaHtml}${relleno}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${COLOR.fondo}" style="background-color:${COLOR.fondo};">
    <tr>
      <td align="center" class="correo-margen" style="padding:32px 16px;">
        <!--[if mso]><table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;border-collapse:separate;background-color:${COLOR.superficie};border:1px solid ${COLOR.borde};border-radius:16px;">
          <tr>
            <td class="correo-encabezado" bgcolor="${COLOR.primario}" style="padding:24px 32px;background-color:${COLOR.primario};border-radius:15px 15px 0 0;">
              ${marca}
              <p style="margin:12px 0 0;font-family:${LETRA};font-size:12px;line-height:16px;font-weight:700;letter-spacing:.08em;color:${COLOR.marcaSuave};">PORTAL DE EMPLEO</p>
            </td>
          </tr>
          <tr>
            <td class="correo-cuerpo" style="padding:32px;font-family:${LETRA};color:${COLOR.texto};">
              <h1 style="margin:0 0 16px;font-family:${LETRA_TITULO};font-size:26px;line-height:32px;font-weight:400;color:${COLOR.texto};">${tituloHtml}</h1>
              <p style="margin:0;font-family:${LETRA};font-size:16px;line-height:26px;color:${COLOR.texto};">${mensajeHtml}</p>${boton}${nota}
            </td>
          </tr>
        </table>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
          <tr>
            <td align="center" style="padding:20px 16px 0;font-family:${LETRA};font-size:12px;line-height:18px;color:${COLOR.textoSecundario};">${pieHtml}<br>${PIE_INSTITUCION}</td>
          </tr>
        </table>
        <!--[if mso]></td></tr></table><![endif]-->
      </td>
    </tr>
  </table>
</body>
</html>`;
}
