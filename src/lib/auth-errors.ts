import type { AuthError } from "@supabase/supabase-js";
import { err, type Resultado } from "@/lib/resultado";

export function traducirErrorAuth(error: AuthError): Resultado<never> {
  switch (error.code) {
    case "invalid_credentials":
      return err("DATOS_INVALIDOS", "El email o la contraseña no son correctos.");
    case "email_not_confirmed":
      return err("DATOS_INVALIDOS", "Confirmá tu email antes de ingresar. Revisá tu bandeja de entrada.");
    case "user_already_exists":
    case "email_exists":
      return err("CONFLICTO", "Ya existe una cuenta con ese email.");
    case "weak_password":
      return err("DATOS_INVALIDOS", "La contraseña es demasiado débil. Probá con una más larga o que combine letras y números.");
    case "same_password":
      return err("DATOS_INVALIDOS", "La nueva contraseña tiene que ser distinta de la anterior.");
    case "otp_expired":
      return err("TOKEN_VENCIDO", "El link venció o ya fue usado. Pedí uno nuevo.");
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return err("DATOS_INVALIDOS", "Demasiados intentos. Esperá unos minutos antes de volver a intentarlo.");
    case "validation_failed":
      return err("DATOS_INVALIDOS", "Los datos ingresados no son válidos. Revisalos e intentá de nuevo.");
    default:
      return err("ERROR_INTERNO", "Ocurrió un error inesperado. Intentá de nuevo.");
  }
}
