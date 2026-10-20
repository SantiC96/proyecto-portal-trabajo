/** Iniciales de una persona: primera letra del nombre y del apellido. */
export function inicialesDePersona(nombre: string, apellido: string): string | undefined {
  const letras = `${nombre.trim().charAt(0)}${apellido.trim().charAt(0)}`.toUpperCase();
  return letras || undefined;
}

// No cuentan para las iniciales de una empresa ("Panadería del Sol S.R.L." → "PS").
const PALABRAS_SIN_INICIAL = new Set(["sa", "srl", "sas", "sau", "sh", "de", "del", "y", "e"]);

/** Iniciales de una empresa: primera letra de sus dos primeras palabras. */
export function inicialesDeEmpresa(nombre: string): string | undefined {
  const letras = nombre
    .split(/\s+/)
    .filter((p) => /^\p{L}/u.test(p) && !PALABRAS_SIN_INICIAL.has(p.replace(/\./g, "").toLowerCase()))
    .slice(0, 2)
    .map((p) => p.charAt(0))
    .join("")
    .toUpperCase();
  return letras || undefined;
}
