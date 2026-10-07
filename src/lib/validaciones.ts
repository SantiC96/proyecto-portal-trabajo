import { validarCUIT } from "@/lib/cuit";

/** Devuelve el mensaje de error o null si es válido. */

export function validarDNI(raw: string): string | null {
  const limpio = raw.replace(/\D/g, "");
  if (limpio.length < 7 || limpio.length > 8)
    return "El DNI debe tener 7 u 8 números.";
  return null;
}

export function validarTelefono(telefono: string): string | null {
  if (!telefono.trim()) return null; // opcional
  if (!/^[+0-9 \-]{8,15}$/.test(telefono.trim()))
    return "El teléfono debe tener entre 8 y 15 caracteres (números, espacios, guiones y +).";
  return null;
}

export function validarEmail(email: string): string | null {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
    return "El correo electrónico no tiene un formato válido.";
  return null;
}

export function validarNombre(nombre: string): string | null {
  const t = nombre.trim();
  if (t.length < 2 || t.length > 60) return "Debe tener entre 2 y 60 caracteres.";
  if (!/^[\p{L} \-']+$/u.test(t))
    return "Solo puede contener letras, espacios, apóstrofos y guiones.";
  return null;
}

export function validarPassword(password: string): string | null {
  if (!password || password.length < 6)
    return "La contraseña debe tener al menos 6 caracteres.";
  return null;
}

export function validarCuitConMensaje(raw: string): string | null {
  if (!validarCUIT(raw)) return "El CUIT no es válido.";
  return null;
}
