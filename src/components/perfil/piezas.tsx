import { AlertCircle } from "lucide-react";
import type { ErrorAccion } from "@/lib/resultado";
import { CLASE_CONTROL_INVALIDO } from "@/components/ui/obligatorio";

// Piezas comunes de las páginas "Mi perfil" de los tres roles.

export type AjusteAvatar = { x: number; y: number; zoom: number };

/** Foto activa del bucket privado "avatares", con su URL firmada. */
export type FotoPerfil = { ruta: string; url: string | null; ajuste: AjusteAvatar };

export const inputClass =
  "w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-placeholder outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60 " +
  CLASE_CONTROL_INVALIDO;

export const inputClassPassword =
  "w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-10 text-sm text-foreground placeholder:text-placeholder outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60 " +
  CLASE_CONTROL_INVALIDO;

export const inputReadonlyClass =
  "w-full rounded-lg border border-border bg-surface-tinted py-2.5 pl-10 pr-4 text-sm text-muted-foreground-strong outline-none cursor-default";

export function InputWrapper({ children }: { children: React.ReactNode }) {
  return <div className="relative">{children}</div>;
}

export function FieldIcon({ icon: Icon }: { icon: React.ElementType }) {
  return (
    <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-icon" />
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-bold uppercase tracking-wider text-primary">{children}</h2>
  );
}

export function CampoLectura({
  label,
  valor,
  vacio = "—",
  className,
}: {
  label: string;
  valor: string;
  vacio?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="mb-0.5 text-xs font-medium uppercase tracking-wider text-muted-icon">{label}</p>
      <p
        className={`whitespace-pre-line break-words text-sm ${valor ? "text-foreground" : "text-muted-foreground"}`}
      >
        {valor || vacio}
      </p>
    </div>
  );
}

export function MensajeError({ error }: { error: ErrorAccion }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
      <div className="flex items-start gap-2.5">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{error.mensaje}</span>
      </div>
      {error.ref && (
        <p className="ml-7 text-xs text-gray-500">
          Si el problema sigue, comunicate con la Oficina de Empleo e indicá este código: {error.ref}
        </p>
      )}
    </div>
  );
}

/** Tarjeta de cada sección del perfil. */
export function TarjetaPerfil({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-border bg-white px-4 py-5 shadow-sm sm:px-6 sm:py-6 ${className}`}
    >
      {children}
    </div>
  );
}
