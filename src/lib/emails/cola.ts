import "server-only";
import { after } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { logError } from "@/lib/logger";
import { armarEmail } from "./plantilla";
import { obtenerSmtp, type Smtp } from "./transporte";

export type ResultadoCola = {
  enviados: number;
  fallidos: number;
};

type EmailReclamado = {
  id: string;
  destinatario: string;
  tipo: string;
  asunto: string;
  mensaje: string;
  link: string | null;
  intentos: number;
};

// Espera antes del reintento según los intentos ya hechos (1.º falló → 1 min,
// 2.º → 5 min, 3.º → 30 min, 4.º → 2 h). Después del 5.º intento la base ya no
// lo reclama (migration_048).
const ESPERAS_REINTENTO_MS = [60_000, 5 * 60_000, 30 * 60_000, 2 * 60 * 60_000];

const LARGO_MAXIMO_ERROR = 500;

/** Sin direcciones ni saltos de línea: queda guardado en la tabla. */
function describirError(error: unknown): string {
  const partes: string[] = [];
  if (typeof error === "object" && error !== null) {
    if ("code" in error && typeof error.code === "string") partes.push(error.code);
    if ("responseCode" in error && typeof error.responseCode === "number") {
      partes.push(String(error.responseCode));
    }
  }
  partes.push(error instanceof Error ? error.message : "Error desconocido");

  return partes
    .join(" ")
    .replace(/[^\s@<>"']+@[^\s@<>"']+/g, "[email]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, LARGO_MAXIMO_ERROR);
}

async function enviarUno(smtp: Smtp, email: EmailReclamado): Promise<boolean> {
  const { asunto, html, texto } = armarEmail({
    titulo: email.asunto,
    mensaje: email.mensaje,
    link: email.link,
  });

  try {
    await smtp.transporte.sendMail({
      from: smtp.remitente,
      to: email.destinatario,
      subject: asunto,
      html,
      text: texto,
    });
  } catch (error) {
    const detalle = describirError(error);
    logError("emails_envio", new Error(detalle), {
      emailId: email.id,
      tipo: email.tipo,
      intentos: email.intentos,
    });

    const espera =
      ESPERAS_REINTENTO_MS[Math.min(email.intentos, ESPERAS_REINTENTO_MS.length) - 1] ??
      ESPERAS_REINTENTO_MS[0];
    const { error: errorMarca } = await supabaseAdmin
      .from("emails_pendientes")
      .update({
        estado: "fallido",
        ultimo_error: detalle,
        proximo_intento: new Date(Date.now() + espera).toISOString(),
        bloqueado_hasta: null,
      })
      .eq("id", email.id)
      .eq("estado", "enviando");
    if (errorMarca) logError("emails_marcar_fallido", errorMarca, { emailId: email.id });
    return false;
  }

  // Si esta marca falla, la fila vuelve a la cola cuando vence el bloqueo y el
  // email se puede mandar dos veces. Se prefiere eso a perderlo.
  const { error: errorMarca } = await supabaseAdmin
    .from("emails_pendientes")
    .update({
      estado: "enviado",
      enviado_en: new Date().toISOString(),
      bloqueado_hasta: null,
    })
    .eq("id", email.id)
    .eq("estado", "enviando");
  if (errorMarca) logError("emails_marcar_enviado", errorMarca, { emailId: email.id });
  return true;
}

/**
 * Reclama hasta `limite` emails de la cola y los manda de a uno. Nunca tira
 * excepción: los errores se registran y el email queda para reintentar.
 */
export async function procesarColaEmails(limite = 20): Promise<ResultadoCola> {
  const resultado: ResultadoCola = { enviados: 0, fallidos: 0 };

  try {
    // Sin configuración no se reclama nada: no se gastan intentos.
    const smtp = obtenerSmtp();
    if (!smtp) return resultado;

    const { data, error } = await supabaseAdmin.rpc("reclamar_emails_pendientes", {
      p_limite: limite,
    });
    if (error) {
      logError("emails_reclamar", error);
      return resultado;
    }

    for (const email of data ?? []) {
      if (await enviarUno(smtp, email)) resultado.enviados++;
      else resultado.fallidos++;
    }
  } catch (error) {
    logError("procesarColaEmails", new Error(describirError(error)));
  }

  return resultado;
}

/**
 * Procesa la cola después de responder (after). Llamarla solo cuando la
 * acción salió bien: after() corre aunque la respuesta sea un error.
 */
export function programarEnvioEmails(): void {
  try {
    after(() => procesarColaEmails());
  } catch (error) {
    logError("programarEnvioEmails", error);
  }
}
