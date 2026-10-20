"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowUpRight,
  Building2,
  CheckCircle,
  Eye,
  EyeOff,
  Lock,
  LogIn,
  Mail,
  UserRound,
} from "lucide-react";
import { login } from "@/app/auth/actions";
import type { ErrorAccion } from "@/lib/resultado";
import { toErrorAccion } from "@/lib/resultado";

export function LoginForm({
  confirmacionError,
  inactividad,
  contrasenaActualizada,
  redirect,
}: {
  confirmacionError?: boolean;
  inactividad?: boolean;
  contrasenaActualizada?: boolean;
  redirect?: string;
}) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ErrorAccion | null>(null);

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
    if (result && !result.ok) {
      setError(toErrorAccion(result));
      setIsLoading(false);
    }
  };

  return (
    <div className="login-card">
      <div className="login-card-surface">
        <div className="login-mobile-brand">
          <span className="login-mobile-brand-icon"><LogIn aria-hidden="true" /></span>
          <span>PORTAL DE EMPLEO · FUNES</span>
        </div>

        <div className="login-card-heading">
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
          <div className="login-field">
            <label htmlFor="login-email">Correo electrónico</label>
            <div className="login-input-wrap">
              <Mail aria-hidden="true" />
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tucorreo@ejemplo.com"
              />
            </div>
          </div>

          {/* Password */}
          <div className="login-field">
            <div className="login-password-label">
              <label htmlFor="login-password">Contraseña</label>
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
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
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
            className="login-submit"
          >
            {isLoading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <LogIn className="h-4 w-4" />
            )}
            {isLoading ? "Ingresando…" : "Iniciar sesión"}
          </button>
        </form>

        <div className="login-registration">
          <p>¿Todavía no tenés una cuenta?</p>
          <Link href="/auth/registro" className="login-register-postulante">
            <UserRound aria-hidden="true" />
            Crear cuenta de postulante
            <ArrowUpRight aria-hidden="true" />
          </Link>
          <Link href="/auth/registro?tipo=empresa" className="login-register-company">
            <Building2 aria-hidden="true" />
            ¿Representás una empresa? Registrate acá
          </Link>
        </div>
      </div>

      <p className="login-back-link">
        <Link href="/">
          ← Volver al inicio
        </Link>
      </p>
    </div>
  );
}
