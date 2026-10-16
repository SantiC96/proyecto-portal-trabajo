export const AVATAR_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type AvatarMimeType = (typeof AVATAR_MIME_TYPES)[number];

export const CV_MIME_TYPES = ["application/pdf"] as const;

export type CvMimeType = (typeof CV_MIME_TYPES)[number];

/** 2 MB en bytes */
export const AVATAR_MAX_SIZE = 2 * 1024 * 1024;
/** 5 MB en bytes */
export const CV_MAX_SIZE = 5 * 1024 * 1024;

export const AVATAR_ACCEPT = "image/jpeg,image/png,image/webp";
export const CV_ACCEPT = "application/pdf";

export const AVATAR_HELP_TEXT = "JPG, PNG o WEBP, hasta 2 MB";
export const CV_HELP_TEXT = "PDF, hasta 5 MB";

export const ERRORES_ARCHIVO = {
  vacio:        "No se recibió ningún archivo.",
  nombreLargo:  "El nombre del archivo es demasiado largo.",
  avatarTipo:   "Solo se aceptan imágenes JPG, PNG o WEBP.",
  avatarTamano: "La imagen no puede superar los 2 MB.",
  avatarFirma:  "El archivo no es válido. Subí un JPG, PNG o WEBP.",
  cvTipo:       "El CV debe ser un archivo PDF.",
  cvTamano:     "El CV no puede superar los 5 MB.",
  cvFirma:      "El archivo no es válido. Subí un PDF.",
} as const;

export function validarTipoAvatar(mimeType: string): mimeType is AvatarMimeType {
  return AVATAR_MIME_TYPES.some((tipo) => tipo === mimeType);
}

export function validarTipoCV(mimeType: string): mimeType is CvMimeType {
  return mimeType === "application/pdf";
}

/**
 * Lee los primeros bytes del archivo y devuelve el MIME type real,
 * o null si no coincide con ningún formato conocido.
 *
 * Firmas soportadas:
 *   PDF   → %PDF-            25 50 44 46 2D
 *   JPEG  → FF D8 FF
 *   PNG   → 89 50 4E 47 0D 0A 1A 0A
 *   WEBP  → RIFF????WEBP     52 49 46 46 ** ** ** ** 57 45 42 50
 */
export function detectarMimeType(bytes: Uint8Array): string | null {
  // PDF: %PDF-
  if (
    bytes.length >= 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  ) {
    return "application/pdf";
  }

  // JPEG: FF D8 FF
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "image/jpeg";
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }

  // WEBP: RIFF en bytes 0-3, WEBP en bytes 8-11
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }

  return null;
}
