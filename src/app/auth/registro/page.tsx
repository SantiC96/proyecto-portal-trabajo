import type { Metadata } from "next";
import { PublicFooter } from "@/components/public/public-footer";
import { RegistroPostulanteForm } from "@/components/auth/registro-postulante-form";

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
    return (
      <>
        <main className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6">
          <div className="w-full max-w-md rounded-2xl border border-border bg-white px-8 py-10 text-center shadow-sm">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Registro de Empresa
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">Próximamente</p>
          </div>
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
