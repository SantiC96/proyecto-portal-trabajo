import type { ReactNode } from "react";
import { FileText, TriangleAlert, type LucideIcon } from "lucide-react";
import type { ErrorAccion } from "@/lib/resultado";
import { IconoCuadro } from "@/components/ui/icono-cuadro";
import { CLASE_CONTROL_INVALIDO } from "@/components/ui/obligatorio";
import { Aviso } from "@/components/ui/aviso";
import { cn } from "@/lib/utils";

// Piezas comunes de las páginas "Mi perfil" de los tres roles.

export type AjusteAvatar = { x: number; y: number; zoom: number };

/** Foto activa del bucket privado "avatares", con su URL firmada. */
export type FotoPerfil = { ruta: string; url: string | null; ajuste: AjusteAvatar };

export const inputClass =
  "w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-placeholder outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60 " +
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
  chipVacio = true,
}: {
  label: string;
  valor: string;
  vacio?: string;
  className?: string;
  /** Con `estiloPerfil`: false muestra el vacío como texto gris, sin chip (datos de solo lectura). */
  chipVacio?: boolean;
  /**
   * Modo lectura de las tarjetas de Mi perfil del postulante: label 13 px 700
   * `neutral` arriba y valor 16 px abajo; el vacío, un ChipSinCompletar.
   */
  estiloPerfil?: boolean;
}) {
  if (estiloPerfil) {
    return (
      <div className={`flex min-w-0 flex-col gap-1 ${className ?? ""}`}>
        <dt className="text-[13px] leading-[1.4] font-bold text-neutral">{label}</dt>
        <dd className="text-base leading-[1.45] whitespace-pre-line break-words text-control-foreground">
          {valor ||
            (chipVacio ? (
              <ChipSinCompletar>{vacio}</ChipSinCompletar>
            ) : (
              <span className="text-muted-foreground">{vacio}</span>
            ))}
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

/** Un dato sin completar en el modo lectura de Mi perfil: chip amarillo con TriangleAlert. */
export function ChipSinCompletar({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex min-h-7 items-center gap-1.5 rounded-[var(--radius-sm)] bg-accent/20 px-2.5 py-0.5 text-sm font-bold text-invitacion-titulo">
      <TriangleAlert className="size-4 shrink-0" aria-hidden="true" />
      {children}
    </span>
  );
}

/**
 * Un archivo del perfil (CV o comprobante): FileText en un cuadrado verde al
 * 10 %, el nombre, sus datos ("120 KB · PDF · Cargado el …"), el badge si
 * tiene y las acciones a la derecha (debajo en el celular).
 */
export function FilaArchivoPerfil({
  nombre,
  detalle,
  nota,
  badge,
  acciones,
  className,
}: {
  nombre: string;
  detalle: string;
  /** Debajo del detalle: una aclaración o la revisión del comprobante (oficina). */
  nota?: ReactNode;
  badge?: ReactNode;
  acciones?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-[var(--radius-lg)] border border-border bg-surface px-4 py-3 sm:flex-row sm:items-center",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span
          aria-hidden="true"
          className="grid size-11 shrink-0 place-items-center rounded-[var(--radius-md)] bg-primary/10 text-primary"
        >
          <FileText className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-[15px] font-bold break-all text-heading">{nombre}</p>
          <p className="text-[13px] text-muted-foreground">{detalle}</p>
          {nota && <div className="mt-0.5 text-[13px] text-muted-foreground">{nota}</div>}
        </div>
      </div>
      {(badge || acciones) && (
        <div className="flex flex-wrap items-center gap-2">
          {badge}
          {acciones}
        </div>
      )}
    </div>
  );
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
  icono,
  claseIcono,
  children,
}: {
  id: string;
  titulo: string;
  ayuda?: React.ReactNode;
  /** A la derecha del título (por ejemplo "Cambiar contraseña"). */
  acciones?: React.ReactNode;
  /** Ícono de la sección junto al título (perfil del postulante). */
  icono?: LucideIcon;
  /** Fondo del cuadrado del ícono (por defecto, `primary`). */
  claseIcono?: string;
  children?: React.ReactNode;
}) {
  const idTitulo = `${id}-titulo`;
  const encabezado = (
    <div className="min-w-0">
      <h2 id={idTitulo} className="text-lg font-extrabold text-heading sm:text-xl">
        {titulo}
      </h2>
      {ayuda && <p className="mt-1 text-sm text-muted-foreground">{ayuda}</p>}
    </div>
  );
  return (
    <section
      id={id}
      aria-labelledby={idTitulo}
      className="tarjeta flex scroll-mt-20 flex-col gap-5 px-4 py-[18px] sm:p-6"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        {icono ? (
          <div className="flex min-w-0 items-center gap-3">
            <IconoCuadro icono={icono} className={claseIcono} />
            {encabezado}
          </div>
        ) : (
          encabezado
        )}
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
