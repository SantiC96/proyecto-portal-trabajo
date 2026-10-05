import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/layout/site-header";
import { SesionProvider } from "@/components/layout/sesion-provider";
import { obtenerSesionActual } from "@/lib/sesion";

export const metadata: Metadata = {
  title: "Portal de Empleo | Municipalidad de Funes",
  description:
    "Portal oficial de intermediación laboral de la Municipalidad de Funes. Conectamos el talento de nuestra ciudad con oportunidades laborales en comercios y empresas.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const sesion = await obtenerSesionActual();
  const sesionCtx = sesion
    ? { nombre: sesion.nombre, rol: sesion.rol, profileHref: sesion.profileHref }
    : null;

  return (
    <html lang="es">
      <body className="flex min-h-screen flex-col bg-background text-foreground">
        <SiteHeader sesion={sesion} />
        <SesionProvider sesion={sesionCtx}>
          {children}
        </SesionProvider>
      </body>
    </html>
  );
}
