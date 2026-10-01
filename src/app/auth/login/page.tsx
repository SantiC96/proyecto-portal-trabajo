import type { Metadata } from "next";
import { NavbarSimple } from "@/components/public/navbar-simple";
import { PublicFooter } from "@/components/public/public-footer";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Iniciar sesión | Portal de Empleo Funes",
  description:
    "Accedé a tu cuenta en el Portal de Empleo de la Municipalidad de Funes. Tanto Postulantes como Empresas usan este mismo acceso.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <NavbarSimple />

      <main className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6">
        <LoginForm confirmacionError={error === "confirmacion"} />
      </main>

      <PublicFooter />
    </div>
  );
}
