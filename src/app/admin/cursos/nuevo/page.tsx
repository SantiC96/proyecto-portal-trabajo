import type { Metadata } from "next";
import { CursoForm } from "../curso-form";
import { requerirRolPagina } from "@/lib/auth";
import { BotonVolver } from "@/components/ui/boton-volver";
import { EncabezadoPagina } from "@/components/ui/encabezado-pagina";

export const metadata: Metadata = {
  title: "Nuevo curso | Panel municipal | Portal de Empleo Funes",
};

export default async function NuevoCursoPage() {
  await requerirRolPagina("municipalidad");
  return (
    <section className="flex w-full flex-col gap-6">
      <BotonVolver href="/admin/cursos" destacado />
      <EncabezadoPagina banda botonesBlancos className="-mt-2" titulo="Crear curso" />
      <CursoForm modo="crear" />
    </section>
  );
}
