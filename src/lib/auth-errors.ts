import type { AuthError } from "@supabase/supabase-js";

export function traducirErrorAuth(error: AuthError): string {
  const code = (error as AuthError & { code?: string }).code;
  switch (code) {
    case "invalid_credentials":
      return "Email o contraseña incorrectos.";
    case "email_not_confirmed":
      return "Confirmá tu email antes de ingresar. Revisá tu bandeja de entrada.";
    case "user_already_exists":
    case "email_exists":
      return "Ya existe una cuenta con ese email.";
    case "weak_password":
      return "La contraseña es demasiado débil. Probá con una más larga o que combine letras y números.";
    case "same_password":
      return "La nueva contraseña tiene que ser distinta de la anterior.";
    case "otp_expired":
      return "El link venció o ya fue usado. Pedí uno nuevo.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Demasiados intentos. Esperá unos minutos antes de volver a intentarlo.";
    case "validation_failed":
      return "Los datos ingresados no son válidos. Revisalos e intentá de nuevo.";
    default:
      return "Ocurrió un error inesperado. Intentá de nuevo.";
  }
}
