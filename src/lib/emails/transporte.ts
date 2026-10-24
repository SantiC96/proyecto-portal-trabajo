import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { logError } from "@/lib/logger";
import { CID_LOGO, LOGO_CORREO_PNG_BASE64 } from "./logo-correo";

export type Smtp = {
  transporte: Transporter;
  remitente: string;
};

const VARIABLES_SMTP = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "EMAIL_FROM"] as const;

/**
 * Adjunta el logo como imagen embebida a cada correo que lo usa
 * (src="cid:logo-funes", armado por armarEmail). Va embebido y no por URL
 * porque muchos clientes bloquean las imágenes externas y en local la URL del
 * sitio no es accesible (decisión 034).
 */
export function usarLogoEmbebido(transporte: Transporter): Transporter {
  return transporte.use("compile", (correo, listo) => {
    const { html } = correo.data;
    if (LOGO_CORREO_PNG_BASE64 && typeof html === "string" && html.includes(`cid:${CID_LOGO}`)) {
      const adjuntos = correo.data.attachments ?? [];
      correo.data.attachments = [
        ...adjuntos,
        {
          filename: "logo-funes.png",
          content: LOGO_CORREO_PNG_BASE64,
          encoding: "base64",
          cid: CID_LOGO,
          contentType: "image/png",
          contentDisposition: "inline",
        },
      ];
    }
    listo();
  });
}

// undefined: todavía no se leyó la configuración. null: falta alguna variable
// (ya se registró una vez y no se vuelve a intentar hasta reiniciar).
let smtp: Smtp | null | undefined;

/**
 * Transporte SMTP (Gmail, puerto 465 con TLS). Si falta configuración
 * devuelve null: la cola no reclama nada y los emails esperan.
 */
export function obtenerSmtp(): Smtp | null {
  if (smtp !== undefined) return smtp;

  const faltantes = VARIABLES_SMTP.filter((nombre) => !process.env[nombre]?.trim());
  const puerto = Number(process.env.SMTP_PORT);
  if (!faltantes.length && (!Number.isInteger(puerto) || puerto <= 0)) {
    faltantes.push("SMTP_PORT");
  }

  if (faltantes.length) {
    logError("emails_configuracion", new Error("Faltan variables de entorno para enviar emails"), {
      faltantes: faltantes.join(", "),
    });
    smtp = null;
    return smtp;
  }

  smtp = {
    transporte: usarLogoEmbebido(
      nodemailer.createTransport({
        host: process.env.SMTP_HOST!.trim(),
        port: puerto,
        secure: puerto === 465,
        auth: {
          user: process.env.SMTP_USER!.trim(),
          pass: process.env.SMTP_PASS!,
        },
        // Corre dentro de after(): un servidor que no responde no puede
        // retener la función hasta su tiempo máximo.
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 20_000,
      }),
    ),
    remitente: process.env.EMAIL_FROM!.trim(),
  };
  return smtp;
}
