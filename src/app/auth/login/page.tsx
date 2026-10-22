import type { Metadata } from "next";
import Image from "next/image";
import {
  Briefcase,
  Building2,
  Calendar,
  FileText,
  MonitorCheck,
  Search,
  TrendingUp,
} from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";
import { LinkVolverAuth } from "@/components/auth/auth-shell";

export const metadata: Metadata = {
  title: "Iniciar sesión | Portal de Empleo Funes",
  description:
    "Accedé a tu cuenta en el Portal de Empleo de la Municipalidad de Funes. Tanto Postulantes como Empresas usan este mismo acceso.",
};

// Íconos flotantes del panel verde (decorativos), en la mitad derecha, arriba
// y abajo del texto. Los "anchos" quedan al costado del título: se ocultan en
// pantallas angostas para no taparlo.
const ICONOS_FLOTANTES = [
  { Icono: Calendar, clase: "top-[11%] right-[34%]", demora: "0s" },
  { Icono: Briefcase, clase: "top-[20%] right-[10%]", demora: "-1.5s" },
  { Icono: Building2, clase: "login-icono-flotante--ancho top-[36%] right-[5%]", demora: "-3s" },
  { Icono: FileText, clase: "login-icono-flotante--ancho bottom-[30%] right-[6%]", demora: "-4.5s" },
  { Icono: Search, clase: "bottom-[16%] right-[36%]", demora: "-2.2s" },
  { Icono: MonitorCheck, clase: "bottom-[9%] right-[12%]", demora: "-5.2s" },
];

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; redirect?: string; motivo?: string }>;
}) {
  const { error, redirect, motivo } = await searchParams;
  return (
    <main className="login-pantalla">
      <section className="login-panel" aria-label="Portal de Empleo de la Municipalidad de Funes">
        <div className="login-panel-brillo" aria-hidden="true" />
        <div className="login-panel-anillo" aria-hidden="true" />
        <div aria-hidden="true">
          {ICONOS_FLOTANTES.map(({ Icono, clase, demora }) => (
            <span
              key={demora}
              className={`login-icono-flotante ${clase}`}
              style={{ animationDelay: demora }}
            >
              <Icono />
            </span>
          ))}
        </div>

        <Image
          src="/images/logo-funes-blanco.png"
          alt="Municipalidad de Funes"
          width={185}
          height={52}
          loading="eager"
          className="relative h-auto w-[185px]"
        />

        <div className="login-panel-texto login-entrada">
          <p className="login-panel-volanta">Talento local, nuevas oportunidades</p>
          <p className="login-panel-titulo">
            Un nuevo
            <br />
            camino
            <br />
            empieza acá.
          </p>
          <p className="login-panel-bajada">
            Conectamos a las personas que buscan crecer con las empresas que necesitan su
            talento.
          </p>
        </div>

        <p className="login-panel-nota">
          <TrendingUp aria-hidden="true" className="h-5 w-5" />
          Tu talento puede llegar más lejos
        </p>
      </section>

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
