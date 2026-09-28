import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Portal de Empleo | Municipalidad de Funes",
  description:
    "Portal oficial de intermediación laboral de la Municipalidad de Funes. Conectamos el talento de nuestra ciudad con oportunidades laborales en comercios y empresas.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
