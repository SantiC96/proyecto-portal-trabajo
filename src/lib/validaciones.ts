import { validarCUIT } from "@/lib/cuit";
import { DURACIONES_OFERTA, esDuracionOferta } from "@/lib/ofertas-vencimiento";

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

const MODALIDADES_VALIDAS = ["Presencial", "Híbrido", "Remoto"] as const;
const JORNADAS_VALIDAS = ["Tiempo completo", "Part-time", "Pasantía", "Por proyecto"] as const;

export type OfertaData = {
  titulo: string;
  descripcion: string;
  categorias: string[];
  modalidad: string;
  jornada: string;
  requisitos: string[];
  beneficios: string[];
  cantidadVacantes: number;
  /** Días que la oferta queda publicada (migration_036). */
  duracionDias: number;
};

export function validarOferta(data: OfertaData): string | null {
  if (!data.titulo || data.titulo.trim().length < 5 || data.titulo.trim().length > 120)
    return "El título debe tener entre 5 y 120 caracteres.";
  if (!data.descripcion || data.descripcion.trim().length < 30 || data.descripcion.trim().length > 4000)
    return "La descripción debe tener entre 30 y 4000 caracteres.";
  if (!data.categorias || data.categorias.length < 1 || data.categorias.length > 5)
    return "Seleccioná entre 1 y 5 categorías.";
  if (!MODALIDADES_VALIDAS.includes(data.modalidad as (typeof MODALIDADES_VALIDAS)[number]))
    return "La modalidad no es válida.";
  if (!JORNADAS_VALIDAS.includes(data.jornada as (typeof JORNADAS_VALIDAS)[number]))
    return "La jornada no es válida.";
  if (!esDuracionOferta(data.duracionDias))
    return `La duración debe ser de ${DURACIONES_OFERTA.join(", ").replace(/, (\d+)$/, " o $1")} días.`;
  const reqLimpios = data.requisitos.filter((r) => r.trim().length > 0);
  if (reqLimpios.length < 1)
    return "Agregá al menos un requisito.";
  if (reqLimpios.length > 15)
    return "Podés agregar hasta 15 requisitos.";
  if (data.beneficios.filter((b) => b.trim().length > 0).length > 15)
    return "Podés agregar hasta 15 beneficios.";
  for (const req of data.requisitos) {
    if (req.trim().length > 200)
      return "Cada requisito puede tener hasta 200 caracteres.";
  }
  for (const ben of data.beneficios) {
    if (ben.trim().length > 200)
      return "Cada beneficio puede tener hasta 200 caracteres.";
  }
  if (!Number.isInteger(data.cantidadVacantes) || data.cantidadVacantes < 1)
    return "La cantidad de vacantes debe ser un número entero mayor o igual a 1.";
  return null;
}
