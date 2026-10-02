"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Mail, Lock, Eye, EyeOff, LogIn, AlertCircle } from "lucide-react";
import { RegisterModal } from "@/components/auth/register-modal";
import { login } from "@/app/auth/actions";

export function LoginForm({
  confirmacionError,
  inactividad,
  redirect,
}: {
  confirmacionError?: boolean;
  inactividad?: boolean;
  redirect?: string;
}) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Belt-and-suspenders: force the root layout to re-render after an inactivity signOut
  // so the navbar reflects the cleared session without needing a manual F5.
  useEffect(() => {
    if (inactividad) router.refresh();
  }, [inactividad, router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    const result = await login({ email, password, redirectTo: redirect });
    if (result?.error) {
      setError(result.error);
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      {/* Card */}
      <div className="rounded-2xl border border-border bg-white px-8 py-10 shadow-sm">
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

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="login-email"
              className="text-sm font-medium text-foreground"
            >
              Correo electrónico
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-icon" />
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tucorreo@ejemplo.com"
                className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-placeholder outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="login-password"
                className="text-sm font-medium text-foreground"
              >
                Contraseña
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
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-10 text-sm text-foreground placeholder:text-placeholder outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
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
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            id="login-submit-btn"
            disabled={isLoading}
            className="mt-1 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <LogIn className="h-4 w-4" />
            )}
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

      {/* Back to home */}
      <p className="mt-5 text-center text-xs text-muted-icon">
        <Link href="/" className="hover:text-primary hover:underline">
          ← Volver al inicio
        </Link>
      </p>

      {/* Registration modal — mounted at body level via portal */}
      {registerModalOpen &&
        createPortal(
          <RegisterModal onClose={() => setRegisterModalOpen(false)} />,
          document.body
        )}
    </div>
  );
}
