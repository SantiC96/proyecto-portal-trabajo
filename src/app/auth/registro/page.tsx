import type { Metadata } from "next";
import { NavbarSimple } from "@/components/public/navbar-simple";
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
      <div className="flex min-h-screen flex-col bg-[#f8f8f4] text-[#1b2926]">
        <NavbarSimple />
        <main className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6">
          <div className="w-full max-w-md rounded-2xl border border-[#d8ddd7] bg-white px-8 py-10 text-center shadow-sm">
            <h1 className="text-2xl font-bold tracking-tight text-[#1b2926]">
              Registro de Empresa
            </h1>
            <p className="mt-3 text-sm text-[#6e7772]">Próximamente</p>
          </div>
        </main>
        <PublicFooter />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f8f8f4] text-[#1b2926]">
      <NavbarSimple />

      <main className="flex flex-1 justify-center px-4 py-10 sm:px-6">
        <RegistroPostulanteForm />
      </main>

      <PublicFooter />
    </div>
  );
}
