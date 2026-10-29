import type { ErrorAccion } from "@/lib/resultado";
import { CLASE_CONTROL_INVALIDO } from "@/components/ui/obligatorio";
import { Aviso } from "@/components/ui/aviso";

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
  estiloPerfil = false,
}: {
  label: string;
  valor: string;
  vacio?: string;
  className?: string;
  /**
   * Modo lectura de las tarjetas de Mi perfil del postulante: label 14 px 700
   * `neutral` y valor 15 px, como DatosClave; el vacío en `muted-foreground`.
   */
  estiloPerfil?: boolean;
}) {
  if (estiloPerfil) {
    return (
      <div className={`flex min-w-0 flex-col gap-0.5 ${className ?? ""}`}>
        <dt className="text-sm leading-[1.5] font-bold text-neutral">{label}</dt>
        <dd
          className={`whitespace-pre-line break-words text-[15px] leading-[1.45] ${valor ? "text-control-foreground" : "text-muted-foreground"}`}
        >
          {valor || vacio}
        </dd>
      </div>
    );
  }
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

/** Grilla de CampoLectura (estiloPerfil) de una tarjeta en modo lectura: 1 columna en el celular, 2 desde sm. */
export function GrillaLectura({ children }: { children: React.ReactNode }) {
  return <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">{children}</dl>;
}

export function MensajeError({ error }: { error: ErrorAccion }) {
  return (
    <Aviso tono="danger">
      <p>{error.mensaje}</p>
      {error.ref && (
        <p className="mt-1 text-sm">
          Si el problema sigue, comunicate con la Oficina de Empleo e indicá este código: {error.ref}
        </p>
      )}
    </Aviso>
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
      className={`tarjeta px-4 py-5 sm:px-6 sm:py-6 ${className}`}
    >
      {children}
    </div>
  );
}

// ─── Rediseño del perfil del postulante (PR 4) ─────────────────────────────

/** Campo del perfil: alto 48, borde 1,5 px border-campo y radio 10. */
export const CLASE_CAMPO_PERFIL = "campo min-h-12 rounded-[var(--radius-md)] border-border-campo";
/** El mismo campo con un ícono a la izquierda (FieldIcon). */
export const CLASE_CAMPO_CON_ICONO = `${CLASE_CAMPO_PERFIL} pl-10`;
export const CLASE_ETIQUETA_PERFIL = "text-[15px] font-bold text-control-foreground";
export const CLASE_AYUDA_PERFIL = "text-[13px] leading-snug text-muted-foreground";
/** Para ErrorCampo: 13 px 600 en rojo. */
export const CLASE_ERROR_PERFIL = "text-[13px] font-semibold";

/**
 * Tarjeta de una sección de "Mi perfil": título, una línea de ayuda opcional
 * y el contenido. El id es el ancla del índice "En esta página".
 */
export function SeccionPerfil({
  id,
  titulo,
  ayuda,
  acciones,
  children,
}: {
  id: string;
  titulo: string;
  ayuda?: React.ReactNode;
  /** A la derecha del título (por ejemplo "Cambiar contraseña"). */
  acciones?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const idTitulo = `${id}-titulo`;
  return (
    <section
      id={id}
      aria-labelledby={idTitulo}
      className="tarjeta flex scroll-mt-20 flex-col gap-5 px-4 py-[18px] sm:p-6"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 id={idTitulo} className="text-lg font-extrabold text-heading sm:text-xl">
            {titulo}
          </h2>
          {ayuda && <p className="mt-1 text-sm text-muted-foreground">{ayuda}</p>}
        </div>
        {acciones}
      </div>
      {children}
    </section>
  );
}

/** Botones al pie de una sección: a la derecha; en el celular, a todo el ancho. */
export function PieSeccion({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">{children}</div>
  );
}
