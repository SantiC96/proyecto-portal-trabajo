import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { RegistroPostulanteForm } from "@/components/auth/registro-postulante-form";
import { RegistroEmpresaForm } from "@/components/auth/registro-empresa-form";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const metadata: Metadata = {
  title: "Registro | Portal de Empleo Funes",
  description:
    "Creá tu cuenta en el Portal de Empleo de la Municipalidad de Funes.",
};

interface Props {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function RegistroPage({ searchParams }: Props) {
  const { tipo } = await searchParams;

  if (tipo === "empresa") {
    const supabase = await createSupabaseServerClient();
    const { data: categorias } = await supabase
      .from("categorias")
      .select("id, nombre")
      .order("nombre");

    return (
      <AuthShell ancho="amplio">
        <RegistroEmpresaForm categorias={categorias ?? []} />
      </AuthShell>
    );
  }

  return (
    <AuthShell ancho="amplio">
      <RegistroPostulanteForm />
    </AuthShell>
  );
}
