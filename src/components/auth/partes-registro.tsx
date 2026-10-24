"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { ErrorCampo, Obligatorio, idErrorCampo } from "@/components/ui/obligatorio";
import { SeccionNumerada } from "@/components/ui/seccion-numerada";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

/** Título del registro en Georgia, como el del login, con la bajada. */
export function EncabezadoRegistro({ titulo }: { titulo: string }) {
  return (
    <div className="mb-8 text-center">
      <h1 className="login-titulo">{titulo}</h1>
      <p className="mt-3 text-[15px] text-muted-foreground">
        Completá tus datos. Te vamos a mandar un email para confirmar la cuenta.
      </p>
    </div>
  );
}

/** id del texto de ayuda de un campo. */
export function idAyudaCampo(idCampo: string): string {
  return `${idCampo}-ayuda`;
}

/** aria-invalid y aria-describedby (error y ayuda) de un control. */
export function ariaCampo(idCampo: string, error: string | null | undefined, conAyuda = false) {
  const ids = [error ? idErrorCampo(idCampo) : null, conAyuda ? idAyudaCampo(idCampo) : null]
    .filter(Boolean)
    .join(" ");
  return {
    ...(error ? { "aria-invalid": true as const } : {}),
    ...(ids ? { "aria-describedby": ids } : {}),
  };
}

/** Un campo del registro: label, control, ayuda y error. */
export function CampoRegistro({
  id,
  etiqueta,
  obligatorio = false,
  opcional = false,
  ayuda,
  error,
  className,
  children,
}: {
  id: string;
  etiqueta: string;
  obligatorio?: boolean;
  opcional?: boolean;
  ayuda?: ReactNode;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <label htmlFor={id} className="etiqueta-campo">
        {etiqueta} {obligatorio && <Obligatorio />}
        {opcional && <span className="text-sm font-normal text-muted-foreground">(opcional)</span>}
      </label>
      {children}
      {ayuda && (
        <p id={idAyudaCampo(id)} className="text-sm text-muted-foreground">
          {ayuda}
        </p>
      )}
      <ErrorCampo idCampo={id} mensaje={error} />
    </div>
  );
}

/** Grilla de los campos de una sección: 2 columnas en escritorio, 1 en el celular. */
export function GrillaCampos({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">{children}</div>;
}

type PropsAcceso = {
  numero: number;
  email: string;
  password: string;
  passwordRepeat: string;
  onEmail: (valor: string) => void;
  onPassword: (valor: string) => void;
  onPasswordRepeat: (valor: string) => void;
  errores: { email?: string; password?: string; passwordRepeat?: string };
  placeholderEmail: string;
};

/** Sección "Datos de acceso": email, contraseña y repetir contraseña. */
export function SeccionAcceso({
  numero,
  email,
  password,
  passwordRepeat,
  onEmail,
  onPassword,
  onPasswordRepeat,
  errores,
  placeholderEmail,
}: PropsAcceso) {
  const noCoinciden = passwordRepeat !== "" && password !== passwordRepeat;
  const coinciden = passwordRepeat !== "" && !noCoinciden;

  return (
    <SeccionNumerada numero={numero} id="seccion-acceso" titulo="Datos de acceso" variante="plana">
      <GrillaCampos>
        <CampoRegistro
          id="reg-email"
          etiqueta="Correo electrónico"
          obligatorio
          error={errores.email}
          className="sm:col-span-2"
        >
          <input
            id="reg-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => onEmail(e.target.value)}
            placeholder={placeholderEmail}
            className="campo"
            {...ariaCampo("reg-email", errores.email)}
          />
        </CampoRegistro>

        <CampoRegistro
          id="reg-password"
          etiqueta="Contraseña"
          obligatorio
          ayuda="Mínimo 8 caracteres."
          error={errores.password}
        >
          <CampoContrasena
            id="reg-password"
            value={password}
            onChange={onPassword}
            placeholder="Tu contraseña"
            aria={ariaCampo("reg-password", errores.password, true)}
          />
        </CampoRegistro>

        <CampoRegistro
          id="reg-password-repeat"
          etiqueta="Repetir contraseña"
          obligatorio
          error={errores.passwordRepeat}
        >
          <CampoContrasena
            id="reg-password-repeat"
            value={passwordRepeat}
            onChange={onPasswordRepeat}
            placeholder="Repetí tu contraseña"
            invalido={noCoinciden}
            aria={ariaCampo("reg-password-repeat", errores.passwordRepeat)}
          />
          <div aria-live="polite">
            {noCoinciden && (
              <p className="flex items-center gap-1.5 text-sm text-danger">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                Las contraseñas no coinciden.
              </p>
            )}
            {coinciden && (
              <p className="flex items-center gap-1.5 text-sm font-semibold text-primary">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                Las contraseñas coinciden
              </p>
            )}
          </div>
        </CampoRegistro>
      </GrillaCampos>
    </SeccionNumerada>
  );
}

function CampoContrasena({
  id,
  value,
  onChange,
  placeholder,
  invalido = false,
  aria,
}: {
  id: string;
  value: string;
  onChange: (valor: string) => void;
  placeholder: string;
  invalido?: boolean;
  aria: ReturnType<typeof ariaCampo>;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? "text" : "password"}
        autoComplete="new-password"
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "campo pr-12",
          invalido && "border-danger! shadow-[var(--sombra-error-campo)]!",
        )}
        {...aria}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        aria-pressed={visible}
        className="absolute top-1/2 right-1 flex size-11 -translate-y-1/2 items-center justify-center rounded-[var(--radius-md)] text-muted-foreground outline-none hover:text-control-foreground focus-visible:shadow-[var(--sombra-foco)]"
      >
        {visible ? <EyeOff className="size-5" aria-hidden="true" /> : <Eye className="size-5" aria-hidden="true" />}
      </button>
    </div>
  );
}

/** Botón "Crear cuenta" (52 px, a todo el ancho) y el link al login. */
export function PieRegistro({
  id,
  pendiente,
  deshabilitado,
}: {
  id: string;
  pendiente: boolean;
  deshabilitado: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <button
        type="submit"
        id={id}
        disabled={pendiente || deshabilitado}
        aria-busy={pendiente}
        className="btn-primario min-h-[52px]! w-full text-base!"
      >
        {pendiente && <Spinner />}
        {pendiente ? "Registrando…" : "Crear cuenta"}
      </button>
      <p className="text-center text-[15px] text-muted-foreground-strong">
        ¿Ya tenés cuenta?{" "}
        <Link
          href="/auth/login"
          className="rounded-[var(--radius-sm)] font-bold text-primary underline-offset-2 outline-none hover:underline focus-visible:shadow-[var(--sombra-foco)]"
        >
          Iniciá sesión acá
        </Link>
      </p>
    </div>
  );
}
