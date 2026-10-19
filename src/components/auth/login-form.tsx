"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Mail, Lock, Eye, EyeOff, LogIn, AlertCircle, CheckCircle } from "lucide-react";
import { RegisterModal } from "@/components/auth/register-modal";
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
  const { pendiente: isLoading, ejecutar } = useAccion();
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
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
    <div className="w-full max-w-md">
      <BotonVolver href="/" className="mb-3">
        Volver al inicio
      </BotonVolver>
      {/* Card */}
      <div className="rounded-2xl border border-border bg-white px-5 py-8 shadow-sm sm:px-8 sm:py-10">
        {/* Logo + title */}
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Image
            src="/images/logo-funes-color.png"
            alt="Municipalidad de Funes"
            width={92}
            height={26}
            className="object-contain"
            priority
          />
          <div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
              Iniciar sesión
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Portal de Empleo · Municipalidad de Funes
            </p>
          </div>
        </div>

        {/* Confirmation error banner */}
        {confirmacionError && (
          <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 mb-1">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              No pudimos confirmar tu cuenta. El enlace puede haber vencido;
              intentá iniciar sesión o registrate de nuevo.
            </span>
          </div>
        )}

        {/* Inactivity timeout banner */}
        {inactividad && (
          <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 mb-1">
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
          <div className="flex items-start gap-2.5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 mb-1">
            <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Tu contraseña se actualizó. Iniciá sesión con la nueva.</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="login-email"
              className="text-sm font-medium text-foreground"
            >
              Correo electrónico <Obligatorio />
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-icon" />
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
                {...ariaErrorCampo("login-email", campos.errores.email)}
                className={cn(inputClass, "pr-4", CLASE_CONTROL_INVALIDO)}
              />
            </div>
            <ErrorCampo idCampo="login-email" mensaje={campos.errores.email} />
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="login-password"
                className="text-sm font-medium text-foreground"
              >
                Contraseña <Obligatorio />
              </label>
              <Link
                href="/auth/recuperar-contrasena"
                className="text-xs font-medium text-primary hover:underline"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-icon" />
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
                {...ariaErrorCampo("login-password", campos.errores.password)}
                className={cn(inputClass, "pr-10", CLASE_CONTROL_INVALIDO)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-icon transition hover:text-muted-foreground-strong"
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
            <div className="flex flex-col gap-1 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
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
            className="mt-1 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? <Spinner /> : <LogIn className="h-4 w-4" />}
            {isLoading ? "Ingresando…" : "Ingresar"}
          </button>
        </form>

        {/* Divider */}
        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-icon">¿Nuevo en el portal?</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* Register link */}
        <p className="text-center text-sm text-muted-foreground-strong">
          ¿Todavía no estás registrado?{" "}
          <button
            type="button"
            onClick={() => setRegisterModalOpen(true)}
            className="font-semibold text-primary hover:underline"
          >
            Crear una cuenta
          </button>
        </p>
      </div>

      {/* Registration modal — mounted at body level via portal */}
      {registerModalOpen &&
        createPortal(
          <RegisterModal onClose={() => setRegisterModalOpen(false)} />,
          document.body
        )}
    </div>
  );
}
