import type { Metadata } from "next";
import { PublicFooter } from "@/components/public/public-footer";
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
      <>
        <main className="flex flex-1 justify-center px-4 py-10 sm:px-6">
          <RegistroEmpresaForm categorias={categorias ?? []} />
        </main>
        <PublicFooter />
      </>
    );
  }

  return (
    <>
      <main className="flex flex-1 justify-center px-4 py-10 sm:px-6">
        <RegistroPostulanteForm />
      </main>

      <PublicFooter />
    </>
  );
}
