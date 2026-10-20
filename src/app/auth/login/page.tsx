import type { Metadata } from "next";
import {
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ChartNoAxesCombined,
  FileText,
  LaptopMinimalCheck,
  Search,
} from "lucide-react";
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
  searchParams: Promise<{ error?: string; redirect?: string; motivo?: string }>;
}) {
  const { error, redirect, motivo } = await searchParams;
  return (
    <>
      <main className="login-experience">
        <section className="login-visual" aria-label="Oportunidades laborales en Funes">
          <div className="login-visual-glow" aria-hidden="true" />
          <div className="login-visual-brand">
            <span className="login-visual-brand-icon">
              <BriefcaseBusiness aria-hidden="true" />
            </span>
            <span>
              Municipalidad de Funes
              <strong>Portal de Empleo</strong>
            </span>
          </div>

          <div className="login-visual-copy">
            <p className="login-visual-eyebrow">Talento local, nuevas oportunidades</p>
            <h1>
              Un nuevo camino
              <br />
              empieza <span>acá.</span>
            </h1>
            <p>
              Conectamos a las personas que buscan crecer con las empresas que necesitan su
              talento.
            </p>
          </div>

          <div className="login-visual-note">
            <ChartNoAxesCombined aria-hidden="true" />
            <span>Tu talento puede llegar más lejos</span>
          </div>

          <div className="login-work-icons" aria-hidden="true">
            <span className="login-work-icon login-work-icon--briefcase"><BriefcaseBusiness /></span>
            <span className="login-work-icon login-work-icon--document"><FileText /></span>
            <span className="login-work-icon login-work-icon--laptop"><LaptopMinimalCheck /></span>
            <span className="login-work-icon login-work-icon--calendar"><CalendarDays /></span>
            <span className="login-work-icon login-work-icon--search"><Search /></span>
            <span className="login-work-icon login-work-icon--company"><Building2 /></span>
          </div>
        </section>

        <section className="login-content" aria-label="Iniciar sesión">
          <LoginForm
            confirmacionError={error === "confirmacion"}
            inactividad={motivo === "inactividad"}
            contrasenaActualizada={motivo === "contrasena-actualizada"}
            redirect={redirect}
          />
        </section>
      </main>

      <PublicFooter />
    </>
  );
}
