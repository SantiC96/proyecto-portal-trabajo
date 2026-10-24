// Correos del portal, para desarrollo. No manda nada.
//
//   npm run emails:vista-previa  → HTML y texto de ejemplo de cada aviso que
//                                  manda el portal (y de las plantillas de
//                                  Supabase con datos de prueba) en
//                                  emails-vista-previa/ (ignorada por git).
//                                  Abrir emails-vista-previa/index.html.
//   npm run emails:supabase      → regenera docs/emails/supabase/*.html con el
//                                  mismo diseño que armarEmail (src/lib/emails/diseno.ts).
//
// Los avisos salen de armarEmail (src/lib/emails/plantilla.ts) tal cual. Para
// cargarlo con Node se resuelven acá el alias "@/", las importaciones sin
// extensión y "server-only" (que fuera de Next solo tira un error).

import { registerHooks } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CARPETA_VISTA_PREVIA = path.join(RAIZ, "emails-vista-previa");
const CARPETA_SUPABASE = path.join(RAIZ, "docs", "emails", "supabase");

registerHooks({
  resolve(especificador, contexto, siguiente) {
    if (especificador === "server-only") {
      return { url: "data:text/javascript,", shortCircuit: true };
    }
    let destino = especificador;
    if (destino.startsWith("@/")) {
      destino = pathToFileURL(path.join(RAIZ, "src", destino.slice(2))).href;
    }
    const desdeTs = contexto.parentURL?.endsWith(".ts");
    const esRuta = destino.startsWith(".") || destino.startsWith("file:");
    if (desdeTs && esRuta && !path.extname(destino)) {
      return siguiente(`${destino}.ts`, contexto);
    }
    return siguiente(destino, contexto);
  },
});

const { armarEmail } = await import(
  pathToFileURL(path.join(RAIZ, "src/lib/emails/plantilla.ts")).href
);
const { escaparHtml, htmlCorreo, textoVistaPrevia } = await import(
  pathToFileURL(path.join(RAIZ, "src/lib/emails/diseno.ts")).href
);
const { CID_LOGO, LOGO_CORREO_PNG_BASE64 } = await import(
  pathToFileURL(path.join(RAIZ, "src/lib/emails/logo-correo.ts")).href
);

// En el correo real el logo es un adjunto embebido (cid:, ver transporte.ts);
// el navegador no lo resuelve, así que acá va como data URI.
function conLogoVisible(html) {
  return html
    .split(`cid:${CID_LOGO}`)
    .join(`data:image/png;base64,${LOGO_CORREO_PNG_BASE64}`);
}

// ─── Plantillas de Supabase ─────────────────────────────────────────────────
// Los links son los que esperan las rutas del portal (ver
// docs/emails/supabase/README.md). Solo variables de la guía de emails.

const PIE_SUPABASE = "Recibís este correo porque se usó esta dirección en el Portal de Empleo Funes.";

const PLANTILLAS_SUPABASE = [
  {
    archivo: "confirmar-registro.html",
    titulo: "Confirmá tu cuenta",
    mensaje:
      "Gracias por registrarte en el Portal de Empleo de la Municipalidad de Funes. Para activar tu cuenta, confirmá tu email con el botón de abajo.",
    boton: "Confirmar mi email",
    link: "{{ .ConfirmationURL }}",
    nota: "Si no creaste una cuenta en el portal, podés ignorar este correo. El link vence en 1 hora.",
    ejemplo: {
      "{{ .ConfirmationURL }}":
        "https://proyecto.supabase.co/auth/v1/verify?token=pkce_ejemplo&type=signup&redirect_to=http://localhost:3000/auth/callback",
    },
  },
  {
    archivo: "recuperar-contrasena.html",
    titulo: "Recuperá tu contraseña",
    mensaje:
      "Recibimos un pedido para crear una contraseña nueva para tu cuenta del Portal de Empleo. Para elegirla, usá el botón de abajo.",
    boton: "Crear contraseña nueva",
    link: "{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=recovery",
    nota: "Si no pediste esto, podés ignorar este correo. Tu contraseña no cambia. El link vence en 1 hora.",
    ejemplo: {
      "{{ .RedirectTo }}": "http://localhost:3000/auth/nueva-contrasena",
      "{{ .TokenHash }}": "0123456789abcdef",
    },
  },
  {
    archivo: "invitacion.html",
    titulo: "Te invitaron a la Oficina de Empleo",
    mensaje:
      "Te crearon una cuenta de la Oficina de Empleo en el Portal de Empleo de la Municipalidad de Funes. Para activarla, elegí tu contraseña con el botón de abajo.",
    boton: "Activar mi cuenta",
    link: "{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=invite",
    nota: "Si no pediste esto, podés ignorar este correo. El link vence en 1 hora.",
    ejemplo: {
      "{{ .RedirectTo }}": "http://localhost:3000/auth/aceptar-invitacion",
      "{{ .TokenHash }}": "0123456789abcdef",
    },
  },
];

// Las plantillas son constantes de este archivo: los textos se escapan, pero
// los links y el logo van tal cual para que las variables de Supabase y el
// "&" queden exactamente como los espera el código.
function htmlSupabase(p) {
  return htmlCorreo({
    tituloHtml: escaparHtml(p.titulo),
    mensajeHtml: escaparHtml(p.mensaje),
    url: p.link,
    textoBotonHtml: escaparHtml(p.boton),
    notaHtml: escaparHtml(p.nota),
    vistaPreviaHtml: escaparHtml(textoVistaPrevia(p.mensaje)),
    logoUrl: "{{ .SiteURL }}/images/logo-funes-blanco.png",
    pieHtml: escaparHtml(PIE_SUPABASE),
  });
}

function reemplazarTodo(texto, valores) {
  return Object.entries(valores).reduce((t, [de, a]) => t.split(de).join(a), texto);
}

// ─── Avisos del portal ──────────────────────────────────────────────────────
// Uno por cada tipo de email_tipo_con_envio (migración 056) más la
// confirmación de postulación (048). Los textos copian los de los triggers.

const AVISOS = [
  // Postulante
  ["postulacion_recibida", "Recibimos tu postulación a «Cajero/a»", "La Oficina de Empleo recibió tu postulación a «Cajero/a» de Supermercado Funes. Te vamos a avisar cuando haya novedades. Podés seguir el estado en Mis postulaciones.", "/mis-postulaciones"],
  ["postulacion_derivada", "Tu postulación fue derivada", "La Oficina de Empleo derivó tu postulación a «Cajero/a» a Supermercado Funes. Te avisamos acá cuando la empresa coordine una entrevista.", "/mis-postulaciones"],
  ["entrevista", "Entrevista coordinada", "Supermercado Funes coordinó una entrevista con vos para «Cajero/a». Fecha: 12/11/2026 10:30. Lugar: Av. Galicia 1234, Funes.", "/mis-postulaciones"],
  ["seleccionado", "¡Fuiste seleccionado!", "Supermercado Funes te seleccionó para el puesto «Cajero/a».", "/mis-postulaciones"],
  ["no_seleccionado_empresa", "No fuiste seleccionado", "Esta vez Supermercado Funes no te seleccionó para «Cajero/a». Podés seguir postulándote a otras ofertas del portal.", "/mis-postulaciones"],
  ["no_seleccionado_oficina", "Postulación no seleccionada", "Tu postulación a «Cajero/a» (Supermercado Funes) no fue seleccionada por la Oficina de Empleo. Podés seguir postulándote a otras ofertas del portal.", "/mis-postulaciones"],
  ["curso_asignado", "Te asignaron un curso", "La Oficina de Empleo te asignó el curso «Atención al cliente». Entrá para ver las indicaciones.", "/mis-cursos/00000000-0000-0000-0000-000000000001"],
  ["pre_entrevista_coordinada", "Pre-entrevista coordinada", "La Oficina de Empleo coordinó una pre-entrevista con vos por tu postulación a «Cajero/a» (Supermercado Funes). Fecha: 05/11/2026 09:00. Lugar: Oficina de Empleo.", "/mis-postulaciones"],
  ["pre_entrevista_reprogramada", "Pre-entrevista reprogramada", "La Oficina de Empleo reprogramó tu pre-entrevista por tu postulación a «Cajero/a» (Supermercado Funes). Fecha: 06/11/2026 11:00. Lugar: Oficina de Empleo.", "/mis-postulaciones"],
  ["postulacion_cerrada", "Postulación cerrada", "La empresa retiró la oferta «Cajero/a». Tu postulación quedó cerrada; podés seguir postulándote a otras ofertas.", "/mis-postulaciones"],
  ["comprobante_aprobado", "Domicilio verificado", "Verificamos tu domicilio en Funes.", "/perfil"],
  ["comprobante_rechazado", "Comprobante de domicilio rechazado", "Tu comprobante de domicilio no es válido: la foto no se lee. Podés subir otro desde tu perfil.", "/perfil"],
  ["invitacion_oferta", "Una oferta para vos", "La Oficina de Empleo te propone la oferta «Cajero/a» de Supermercado Funes. Entrá para decirnos si te interesa.", "/invitaciones"],
  // Empresa
  ["solicitud_aprobada", "Tu empresa fue aprobada", "La Oficina de Empleo aprobó la solicitud de Supermercado Funes S.A. Ya podés publicar ofertas laborales.", "/empresa"],
  ["solicitud_rechazada", "Tu solicitud fue rechazada", "La Oficina de Empleo rechazó la solicitud de Supermercado Funes S.A. Motivo: el CUIT no coincide con la razón social. Podés corregir los datos y reenviarla.", "/empresa"],
  ["oferta_aprobada", "Oferta aprobada", "La Oficina de Empleo aprobó tu oferta «Cajero/a». Ya está publicada en el portal hasta el 30/11/2026.", "/empresa/ofertas/00000000-0000-0000-0000-000000000002"],
  ["oferta_rechazada", "Oferta rechazada", "La Oficina de Empleo rechazó tu oferta «Cajero/a». Motivo: falta el horario de trabajo. Podés corregirla y enviarla de nuevo.", "/empresa/ofertas/00000000-0000-0000-0000-000000000002/editar"],
  ["candidato_derivado", "Nuevo candidato derivado", "La Oficina de Empleo te derivó a Ana Pérez para «Cajero/a».", "/empresa/ofertas/00000000-0000-0000-0000-000000000002/candidatos/00000000-0000-0000-0000-000000000003"],
  ["oferta_por_vencer", "Oferta por vencer", "Tu oferta «Cajero/a» vence el 30/11/2026 (en 3 días). Cuando venza vas a poder renovarla desde el detalle de la oferta.", "/empresa/ofertas/00000000-0000-0000-0000-000000000002"],
  ["oferta_vencida", "Oferta vencida", "Tu oferta «Cajero/a» venció el 30/11/2026 y ya no se ve en el portal. Podés renovarla desde el detalle de la oferta.", "/empresa/ofertas/00000000-0000-0000-0000-000000000002"],
  ["candidato_retirado", "Un candidato retiró su postulación", "Ana Pérez retiró su postulación a «Cajero/a».", "/empresa/ofertas/00000000-0000-0000-0000-000000000002"],
  // Oficina
  ["empresa_pendiente", "Nueva empresa para revisar", "Supermercado Funes S.A. se registró en el portal y su solicitud espera revisión.", "/admin/empresas?estado=pendiente"],
  ["oferta_pendiente", "Nueva oferta para revisar", "Supermercado Funes envió la oferta «Cajero/a» para revisión.", "/admin/ofertas/00000000-0000-0000-0000-000000000002"],
  ["contratacion", "Nueva contratación", "Supermercado Funes contrató a Ana Pérez para Cajero/a", "/admin/postulaciones/00000000-0000-0000-0000-000000000004"],
];

// ─── Escritura ──────────────────────────────────────────────────────────────

function escribir(ruta, contenido) {
  fs.mkdirSync(path.dirname(ruta), { recursive: true });
  fs.writeFileSync(ruta, contenido, "utf8");
}

function generarSupabase() {
  for (const p of PLANTILLAS_SUPABASE) {
    const html = htmlSupabase(p).replace(
      "<head>\n",
      "<head>\n<!-- Generado con npm run emails:supabase (scripts/vista-previa-emails.mjs). Cambiar el diseño en src/lib/emails/diseno.ts. -->\n",
    );
    escribir(path.join(CARPETA_SUPABASE, p.archivo), html);
    console.log(`docs/emails/supabase/${p.archivo}`);
  }
}

function generarVistaPrevia() {
  const sitio = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  fs.rmSync(CARPETA_VISTA_PREVIA, { recursive: true, force: true });
  const correos = [];

  process.env.NEXT_PUBLIC_SITE_URL = sitio;
  for (const [tipo, titulo, mensaje, link] of AVISOS) {
    const { asunto, html, texto } = armarEmail({ titulo, mensaje, link });
    escribir(path.join(CARPETA_VISTA_PREVIA, `${tipo}.html`), conLogoVisible(html));
    escribir(path.join(CARPETA_VISTA_PREVIA, `${tipo}.txt`), texto);
    correos.push({ archivo: `${tipo}.html`, nombre: tipo, asunto });
  }

  // Sin NEXT_PUBLIC_SITE_URL no hay botón (el logo va embebido igual).
  delete process.env.NEXT_PUBLIC_SITE_URL;
  const [, titulo, mensaje, link] = AVISOS[1];
  const sinSitio = armarEmail({ titulo, mensaje, link });
  escribir(path.join(CARPETA_VISTA_PREVIA, "sin-url-del-sitio.html"), conLogoVisible(sinSitio.html));
  escribir(path.join(CARPETA_VISTA_PREVIA, "sin-url-del-sitio.txt"), sinSitio.texto);
  correos.push({ archivo: "sin-url-del-sitio.html", nombre: "sin NEXT_PUBLIC_SITE_URL", asunto: sinSitio.asunto });
  process.env.NEXT_PUBLIC_SITE_URL = sitio;

  for (const p of PLANTILLAS_SUPABASE) {
    const archivo = `supabase-${p.archivo}`;
    const html = reemplazarTodo(htmlSupabase(p), { "{{ .SiteURL }}": sitio, ...p.ejemplo });
    escribir(path.join(CARPETA_VISTA_PREVIA, archivo), html);
    correos.push({ archivo, nombre: `Supabase: ${p.archivo}`, asunto: p.titulo });
  }

  const filas = correos
    .map(
      (c) => `<section>
  <h2>${escaparHtml(c.nombre)} <small>${escaparHtml(c.asunto)} · <a href="${c.archivo}">abrir</a></small></h2>
  <div class="marcos">
    <figure><figcaption>600 px</figcaption><iframe src="${c.archivo}" width="600" height="720" loading="lazy"></iframe></figure>
    <figure><figcaption>375 px</figcaption><iframe src="${c.archivo}" width="375" height="720" loading="lazy"></iframe></figure>
  </div>
</section>`,
    )
    .join("\n");

  escribir(
    path.join(CARPETA_VISTA_PREVIA, "index.html"),
    `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Vista previa de correos</title>
<style>
  body { margin: 0; padding: 24px; font-family: system-ui, sans-serif; background: #e9eeeb; color: #17251d; }
  h1 { margin: 0 0 8px; }
  h2 { margin: 32px 0 8px; font-size: 18px; }
  small { font-weight: 400; color: #55665c; }
  .marcos { display: flex; flex-wrap: wrap; gap: 24px; align-items: flex-start; }
  figure { margin: 0; }
  figcaption { font-size: 13px; color: #55665c; margin-bottom: 4px; }
  iframe { border: 1px solid #c6d3cb; background: #fff; }
</style>
</head>
<body>
<h1>Vista previa de correos</h1>
<p>Generado con <code>npm run emails:vista-previa</code>. En los avisos el logo va embebido (acá como data URI); en las plantillas de Supabase se carga de ${escaparHtml(sitio)} (con <code>npm run dev</code> corriendo).</p>
${filas}
</body>
</html>
`,
  );

  console.log(`${correos.length} correos en emails-vista-previa/ — abrí emails-vista-previa/index.html`);
}

if (process.argv.includes("--supabase")) generarSupabase();
else generarVistaPrevia();
