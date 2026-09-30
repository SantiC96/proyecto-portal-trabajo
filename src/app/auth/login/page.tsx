import type { Metadata } from "next";
import { NavbarSimple } from "@/components/public/navbar-simple";
import { PublicFooter } from "@/components/public/public-footer";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Iniciar sesión | Portal de Empleo Funes",
  description:
    "Accedé a tu cuenta en el Portal de Empleo de la Municipalidad de Funes. Tanto Postulantes como Empresas usan este mismo acceso.",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#f8f8f4] text-[#1b2926]">
      <NavbarSimple />

      <main className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6">
        <LoginForm />
      </main>

      <PublicFooter />
    </div>
  );
}
