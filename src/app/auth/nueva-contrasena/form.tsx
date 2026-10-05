"use client";

import { useActionState, useState, useEffect } from "react";
import Link from "next/link";
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle } from "lucide-react";
import { restablecerContrasena } from "@/app/auth/actions";

export function NuevaContrasenaForm({ tokenHash }: { tokenHash: string }) {
  const [state, action, isPending] = useActionState(restablecerContrasena, null);
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmar, setShowConfirmar] = useState(false);

  // Clear fields on server error so the user doesn't re-submit stale values.
  // setTimeout defers the setState calls out of the effect body to avoid cascading renders.
  useEffect(() => {
    if (state?.error) {
      const id = setTimeout(() => {
        setPassword("");
        setConfirmar("");
      }, 0);
      return () => clearTimeout(id);
    }
  }, [state?.error]);

  const confirmarTocado = confirmar.length > 0;
  const coinciden = password === confirmar;
  const passwordValida = password.length >= 6;
  const puedeEnviar = passwordValida && confirmarTocado && coinciden;

  const inputBase =
    "w-full rounded-lg border bg-background py-2.5 pl-10 pr-10 text-sm text-foreground placeholder:text-placeholder outline-none transition";
  const inputFocus = "focus:bg-white focus:ring-2";
  const inputNormal = `border-border focus:border-primary ${inputFocus} focus:ring-primary/20`;
  const inputError = `border-red-400 focus:border-red-400 ${inputFocus} focus:ring-red-400/20`;
  const inputOk = `border-border focus:border-primary ${inputFocus} focus:ring-primary/20`;

  const confirmarInputClass = `${inputBase} ${
    confirmarTocado && !coinciden ? inputError : inputOk
  }`;

  return (
    <div className="w-full max-w-md rounded-2xl border border-border bg-white px-8 py-10 shadow-sm">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Lock className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Nueva contraseña
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Elegí una nueva contraseña para tu cuenta.
        </p>
      </div>

      <form action={action} className="flex flex-col gap-5">
        <input type="hidden" name="token_hash" value={tokenHash} />

        {/* Nueva contraseña */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="nueva-password"
            className="text-sm font-medium text-foreground"
          >
            Nueva contraseña
          </label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-icon" />
            <input
              id="nueva-password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className={`${inputBase} ${inputNormal}`}
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

        {/* Repetir contraseña */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="confirmar-password"
            className="text-sm font-medium text-foreground"
          >
            Repetir contraseña
          </label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-icon" />
            <input
              id="confirmar-password"
              name="confirmar"
              type={showConfirmar ? "text" : "password"}
              autoComplete="new-password"
              required
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              placeholder="Repetí la contraseña"
              className={confirmarInputClass}
            />
            <button
              type="button"
              onClick={() => setShowConfirmar(!showConfirmar)}
              aria-label={showConfirmar ? "Ocultar contraseña" : "Mostrar contraseña"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-icon transition hover:text-muted-foreground-strong"
            >
              {showConfirmar ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>

          {/* Feedback en vivo */}
          {confirmarTocado && (
            <p
              className={`flex items-center gap-1 text-xs ${
                coinciden ? "text-green-600" : "text-red-500"
              }`}
            >
              {coinciden ? (
                <>
                  <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                  Las contraseñas coinciden
                </>
              ) : (
                <>
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  Las contraseñas no coinciden
                </>
              )}
            </p>
          )}
        </div>

        {/* Error de la server action */}
        {state?.error && (
          <div className="flex flex-col gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{state.error}</span>
            </div>
            {state.linkVencido && (
              <Link
                href="/auth/recuperar-contrasena"
                className="ml-6 font-medium underline hover:text-red-700"
              >
                Pedir un link nuevo
              </Link>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={!puedeEnviar || isPending}
          className="mt-1 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <Lock className="h-4 w-4" />
          )}
          {isPending ? "Guardando…" : "Guardar contraseña"}
        </button>
      </form>
    </div>
  );
}
