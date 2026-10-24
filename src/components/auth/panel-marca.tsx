import type { ReactNode } from "react";
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
import { cn } from "@/lib/utils";

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

/**
 * Panel verde de marca del login, del registro y de recuperar la contraseña:
 * patrón de puntos, brillo, anillo, íconos flotantes, logo blanco, volanta,
 * título en Georgia, bajada y la nota del pie. Desde lg es la columna
 * izquierda.
 *
 * En el celular siempre va arriba y más corto: `volver`, la marca, la volanta
 * y el título, sin la bajada, los íconos ni la nota (y sin los saltos de línea
 * del título). Así todas las pantallas que lo usan se ven igual. Con `fijo`
 * queda sticky a la altura de la ventana mientras el formulario de la derecha
 * se desplaza.
 */
export function PanelMarca({
  volanta,
  titulo,
  bajada,
  fijo = false,
  volver,
}: {
  volanta: string;
  titulo: ReactNode;
  bajada: string;
  fijo?: boolean;
  /**
   * Link de volver dentro del panel, solo en el celular. En escritorio la
   * pantalla lo pone en la columna del formulario (con `hidden lg:block`).
   */
  volver?: ReactNode;
}) {
  return (
    <section
      className={cn("login-panel", fijo && "login-panel--fijo")}
      aria-label="Portal de Empleo de la Municipalidad de Funes"
    >
      <div className="login-panel-brillo" aria-hidden="true" />
      <div className="login-panel-anillo" aria-hidden="true" />
      <div className="login-iconos" aria-hidden="true">
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

      {volver && <div className="login-panel-volver">{volver}</div>}

      <Image
        src="/images/logo-funes-blanco.png"
        alt="Municipalidad de Funes"
        width={185}
        height={52}
        loading="eager"
        className="login-panel-logo relative h-auto w-[185px]"
      />

      <div className="login-panel-texto login-entrada">
        <p className="login-panel-volanta">{volanta}</p>
        <p className="login-panel-titulo">{titulo}</p>
        <p className="login-panel-bajada">{bajada}</p>
      </div>

      <p className="login-panel-nota">
        <TrendingUp aria-hidden="true" className="h-5 w-5" />
        Tu talento puede llegar más lejos
      </p>
    </section>
  );
}
