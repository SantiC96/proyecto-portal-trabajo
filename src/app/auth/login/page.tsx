import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";
import { LinkVolverAuth } from "@/components/auth/link-volver-auth";
import { PanelMarca } from "@/components/auth/panel-marca";

export const metadata: Metadata = {
  title: "Iniciar sesión | Portal de Empleo Funes",
  description:
    "Accedé a tu cuenta en el Portal de Empleo de la Municipalidad de Funes. Tanto Postulantes como Empresas usan este mismo acceso.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; redirect?: string; motivo?: string }>;
}) {
  const { error, redirect, motivo } = await searchParams;
  return (
    <main className="login-pantalla">
      <PanelMarca
        volanta="Talento local, nuevas oportunidades"
        titulo={
          <>
            Un nuevo
            <br />
            camino
            <br />
            empieza acá.
          </>
        }
        bajada="Conectamos a las personas que buscan crecer con las empresas que necesitan su talento."
      />

      <div className="login-columna">
        <div className="w-full max-w-[460px]">
          <LinkVolverAuth />
          <LoginForm
            confirmacionError={error === "confirmacion"}
            inactividad={motivo === "inactividad"}
            sesionAnterior={motivo === "sesion-anterior"}
            contrasenaActualizada={motivo === "contrasena-actualizada"}
            cuentaDesactivada={motivo === "cuenta-desactivada"}
            redirect={redirect}
          />
        </div>
      </div>
    </main>
  );
}
