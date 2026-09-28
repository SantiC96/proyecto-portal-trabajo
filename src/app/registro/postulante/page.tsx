import type { Metadata } from "next";
import { NavbarSimple } from "@/components/public/NavbarSimple";
import { PublicFooter } from "@/components/public/PublicFooter";
import { RegistroPostulanteForm } from "@/components/auth/RegistroPostulanteForm";

export const metadata: Metadata = {
  title: "Registro de Postulante | Portal de Empleo Funes",
  description:
    "Creá tu cuenta como postulante en el Portal de Empleo de la Municipalidad de Funes. Completá tus datos personales y cargá tu CV para comenzar a postularte.",
};

export default function RegistroPostulantePage() {
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
