"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff,
  Lock,
  LogIn,
  Mail,
} from "lucide-react";
import { login } from "@/app/auth/actions";
import type { ErrorAccion } from "@/lib/resultado";
import { toErrorAccion } from "@/lib/resultado";
import {
  CLASE_CONTROL_INVALIDO,
  ErrorCampo,
  Obligatorio,
  ariaErrorCampo,
} from "@/components/ui/obligatorio";
import { useErroresCampo } from "@/lib/use-errores-campo";
import { useAccion } from "@/lib/use-accion";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { BotonVolver } from "@/components/ui/boton-volver";
import { MENSAJE_CUENTA_DESACTIVADA } from "@/lib/auth-errors";

const inputClass =
  "w-full rounded-lg border border-border bg-background py-2.5 pl-10 text-sm text-foreground placeholder:text-placeholder outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20";

export function LoginForm({
  confirmacionError,
  inactividad,
  sesionAnterior,
  contrasenaActualizada,
  cuentaDesactivada,
  redirect,
}: {
  confirmacionError?: boolean;
  inactividad?: boolean;
  sesionAnterior?: boolean;
  contrasenaActualizada?: boolean;
  cuentaDesactivada?: boolean;
  redirect?: string;
}) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
<<<<<<< HEAD
  const [isLoading, setIsLoading] = useState(false);
=======
  const { pendiente: isLoading, ejecutar } = useAccion();
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
>>>>>>> origin/develop
  const [error, setError] = useState<ErrorAccion | null>(null);
  const campos = useErroresCampo<"email" | "password">();

  // Belt-and-suspenders: force the root layout to re-render after a proxy signOut
  // (inactivity or previous-browser session) so the navbar reflects the cleared
  // session without needing a manual F5.
  useEffect(() => {
    if (inactividad || sesionAnterior || cuentaDesactivada) router.refresh();
  }, [inactividad, sesionAnterior, cuentaDesactivada, router]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    if (!campos.validar({ email, password }, e.currentTarget)) return;
    // En el éxito la acción redirige.
    ejecutar(async () => {
      const result = await login({ email, password, redirectTo: redirect });
      if (result && !result.ok) setError(toErrorAccion(result));
    });
  };

  return (
<<<<<<< HEAD
    <div className="login-card">
      <div className="login-card-surface">
        <div className="login-mobile-brand">
          <span className="login-mobile-brand-icon"><LogIn aria-hidden="true" /></span>
          <span>PORTAL DE EMPLEO · FUNES</span>
        </div>

        <div className="login-card-heading">
=======
    <div className="w-full max-w-md">
      <BotonVolver href="/" className="mb-3">
        Volver al inicio
      </BotonVolver>
      {/* Card */}
      <div className="rounded-2xl border border-border bg-white px-5 py-8 shadow-sm sm:px-8 sm:py-10">
        {/* Logo + title */}
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
>>>>>>> origin/develop
          <Image
            src="/images/logo-funes-color.png"
            alt="Municipalidad de Funes"
            width={92}
            height={26}
            className="object-contain"
            priority
          />
          <p className="login-card-eyebrow">Tu espacio para avanzar</p>
          <h2>Tu próximo trabajo está más cerca</h2>
          <p>Ingresá para continuar en el Portal de Empleo.</p>
        </div>

        {/* Confirmation error banner */}
        {confirmacionError && (
          <div className="login-feedback login-feedback--error">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              No pudimos confirmar tu cuenta. El enlace puede haber vencido;
              intentá iniciar sesión o registrate de nuevo.
            </span>
          </div>
        )}

        {/* Inactivity timeout banner */}
        {inactividad && (
          <div className="login-feedback login-feedback--warning">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Tu sesión se cerró por inactividad. Iniciá sesión de nuevo.</span>
          </div>
        )}

        {/* Session from a previous browser banner */}
        {sesionAnterior && (
          <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 mb-1">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Por seguridad, volvé a iniciar sesión.</span>
          </div>
        )}

        {/* Cuenta de la oficina desactivada (se cerró la sesión abierta) */}
        {cuentaDesactivada && !error && (
          <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 mb-1">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{MENSAJE_CUENTA_DESACTIVADA}</span>
          </div>
        )}

        {/* Password updated banner */}
        {contrasenaActualizada && (
          <div className="login-feedback login-feedback--success">
            <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Tu contraseña se actualizó. Iniciá sesión con la nueva.</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="login-fields">
          {/* Email */}
<<<<<<< HEAD
          <div className="login-field">
            <label htmlFor="login-email">Correo electrónico</label>
            <div className="login-input-wrap">
              <Mail aria-hidden="true" />
=======
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="login-email"
              className="text-sm font-medium text-foreground"
            >
              Correo electrónico <Obligatorio />
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-icon" />
>>>>>>> origin/develop
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  campos.limpiar("email");
                }}
                placeholder="tucorreo@ejemplo.com"
<<<<<<< HEAD
=======
                {...ariaErrorCampo("login-email", campos.errores.email)}
                className={cn(inputClass, "pr-4", CLASE_CONTROL_INVALIDO)}
>>>>>>> origin/develop
              />
            </div>
            <ErrorCampo idCampo="login-email" mensaje={campos.errores.email} />
          </div>

          {/* Password */}
<<<<<<< HEAD
          <div className="login-field">
            <div className="login-password-label">
              <label htmlFor="login-password">Contraseña</label>
=======
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="login-password"
                className="text-sm font-medium text-foreground"
              >
                Contraseña <Obligatorio />
              </label>
>>>>>>> origin/develop
              <Link
                href="/auth/recuperar-contrasena"
                className="login-text-link"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <div className="login-input-wrap">
              <Lock aria-hidden="true" />
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  campos.limpiar("password");
                }}
                placeholder="••••••••"
<<<<<<< HEAD
=======
                {...ariaErrorCampo("login-password", campos.errores.password)}
                className={cn(inputClass, "pr-10", CLASE_CONTROL_INVALIDO)}
>>>>>>> origin/develop
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                className="login-password-toggle"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            <ErrorCampo idCampo="login-password" mensaje={campos.errores.password} />
          </div>

          {/* Error */}
          {error && (
            <div className="login-feedback login-feedback--error" role="alert" aria-live="polite">
              <div className="flex items-start gap-2.5">
                <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error.mensaje}</span>
              </div>
              {error.ref && (
                <p className="ml-6 text-xs text-gray-500">
                  Si el problema sigue, comunicate con la Oficina de Empleo e indicá este código: {error.ref}
                </p>
              )}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            id="login-submit-btn"
            disabled={isLoading}
            aria-busy={isLoading}
<<<<<<< HEAD
            className="login-submit"
          >
            {isLoading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <LogIn className="h-4 w-4" />
            )}
            {isLoading ? "Ingresando…" : "Iniciar sesión"}
=======
            className="mt-1 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? <Spinner /> : <LogIn className="h-4 w-4" />}
            {isLoading ? "Ingresando…" : "Ingresar"}
>>>>>>> origin/develop
          </button>
        </form>

        <div className="login-registration-footer">
          <h3>¿Nuevo en el portal?</h3>
          <p>
            ¿Todavía no estás registrado?{" "}
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event("portal:open-register-modal"))}
              className="cursor-pointer border-0 bg-transparent p-0 font-bold text-primary hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Crear una cuenta
            </button>
          </p>
        </div>
      </div>

<<<<<<< HEAD
      <p className="login-back-link">
        <Link href="/">
          ← Volver al inicio
        </Link>
      </p>
=======
      {/* Registration modal — mounted at body level via portal */}
      {registerModalOpen &&
        createPortal(
          <RegisterModal onClose={() => setRegisterModalOpen(false)} />,
          document.body
        )}
>>>>>>> origin/develop
    </div>
  );
}
