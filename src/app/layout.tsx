import type { Metadata } from "next";
import { Public_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { SCRIPT_PREFERENCIA_SIDEBAR } from "@/components/layout/preferencia-sidebar";
import { SesionProvider } from "@/components/layout/sesion-provider";
import { obtenerSesionActual } from "@/lib/sesion";

const publicSans = Public_Sans({
  weight: ["400", "500", "600", "700", "800"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-public-sans",
});

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
    // suppressHydrationWarning: el script del <head> pone en <html> la
    // preferencia de sidebar contraída antes de que React hidrate.
    <html lang="es" className={publicSans.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_PREFERENCIA_SIDEBAR }} />
      </head>
      <body className="min-h-screen bg-background text-foreground">
        <SesionProvider sesion={sesionCtx}>
          <AppShell sesion={sesion}>{children}</AppShell>
        </SesionProvider>
        <Toaster
          position="bottom-right"
          duration={4000}
          closeButton
          toastOptions={{
            // Fondo sólido por tipo, sin pastel. Las clases van con "!" para
            // ganarle a los estilos que sonner inyecta.
            classNames: {
              toast:
                "font-sans! rounded-[var(--radius-lg)]! border-0! bg-heading! text-white! text-[15px]! leading-[1.45]!",
              description: "text-white/90!",
              success: "bg-success!",
              info: "bg-info!",
              error: "bg-danger!",
              warning: "bg-accent! text-accent-foreground! [&_[data-description]]:text-accent-foreground!",
              closeButton:
                "border-white/40! bg-heading! text-white! hover:bg-neutral!",
            },
          }}
        />
      </body>
    </html>
  );
}
