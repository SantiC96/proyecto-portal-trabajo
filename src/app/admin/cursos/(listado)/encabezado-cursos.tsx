import Link from "next/link";
import { CheckCircle2, Plus } from "lucide-react";
import { UMBRAL_RECHAZOS_CURSO, VENTANA_RECHAZOS_DIAS } from "@/lib/cursos";

// Partes fijas del encabezado de Cursos: las usan la página y loading.tsx.

export const bajadaCursos = `Cursos asignables a postulantes con ${UMBRAL_RECHAZOS_CURSO} o más rechazos de empresas en los últimos ${VENTANA_RECHAZOS_DIAS} días.`;

export function AccionesCursos() {
  return (
    <>
      <Link href="/admin/cursos/completados" className="btn-secundario">
        <CheckCircle2 aria-hidden="true" />
        Ver cursos completados
      </Link>
      <Link href="/admin/cursos/nuevo" className="btn-primario">
        <Plus aria-hidden="true" />
        Nuevo curso
      </Link>
    </>
  );
}
