import type { Metadata } from "next";
import { CursoForm } from "../curso-form";
import { requerirRolPagina } from "@/lib/auth";
import { BotonVolver } from "@/components/ui/boton-volver";

export const metadata: Metadata = {
  title: "Nuevo curso | Panel municipal | Portal de Empleo Funes",
};

export default async function NuevoCursoPage() {
  await requerirRolPagina("municipalidad");
  return (
    <section className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <BotonVolver href="/admin/cursos">Volver a cursos</BotonVolver>

      <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        Crear curso
      </h1>

      <div className="mt-8 rounded-[var(--radius-lg)] border border-border bg-surface p-6">
        <CursoForm modo="crear" />
      </div>
    </section>
  );
}
