"use client";

import { useState } from "react";
import Link from "next/link";
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle } from "lucide-react";
import { aceptarInvitacion, restablecerContrasena } from "@/app/auth/actions";
import {
  CLASE_CONTROL_INVALIDO,
  ErrorCampo,
  Obligatorio,
  ariaErrorCampo,
} from "@/components/ui/obligatorio";
import { useErroresCampo } from "@/lib/use-errores-campo";
import { useAccion } from "@/lib/use-accion";
import { Spinner } from "@/components/ui/spinner";
import type { Resultado } from "@/lib/resultado";
import { Aviso } from "@/components/ui/aviso";

type Campo = "password" | "confirmar";

// La misma pantalla sirve para recuperar la contraseña y para aceptar la
// invitación de la oficina (/auth/aceptar-invitacion).
const VARIANTES = {
  recuperacion: {
    accion: restablecerContrasena,
    titulo: "Nueva contraseña",
    descripcion: "Elegí una nueva contraseña para tu cuenta.",
    etiqueta: "Nueva contraseña",
    linkVencido: { href: "/auth/recuperar-contrasena", texto: "Pedir un link nuevo" },
  },
  invitacion: {
    accion: aceptarInvitacion,
    titulo: "Activá tu cuenta",
    descripcion:
      "Te invitaron a la cuenta de la Oficina de Empleo. Elegí tu contraseña para entrar al panel.",
    etiqueta: "Contraseña",
    linkVencido: {
      href: "/auth/login",
      texto: "Si ya elegiste tu contraseña, iniciá sesión. Si no, pedí una invitación nueva a la Oficina de Empleo.",
    },
  },
} as const;

export function NuevaContrasenaForm({
  tokenHash,
  variante = "recuperacion",
}: {
  tokenHash: string;
  variante?: keyof typeof VARIANTES;
}) {
  const textos = VARIANTES[variante];
  const [state, setState] = useState<Resultado<void> | null>(null);
  const { pendiente: isPending, ejecutar } = useAccion();
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmar, setShowConfirmar] = useState(false);
  const campos = useErroresCampo<Campo>();

  const stateError = state && !state.ok ? state.mensaje : undefined;
  // Error de un campo devuelto por el servidor: va debajo del campo, no arriba del botón.
  const campoServidor =
    state && !state.ok && (state.campo === "password" || state.campo === "confirmar")
      ? state.campo
      : null;
  const errorCampo = (campo: Campo) =>
    campos.errores[campo] ?? (campoServidor === campo ? stateError : undefined);

  const confirmarTocado = confirmar.length > 0;
  const coinciden = password === confirmar;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!campos.validar({ password, confirmar }, e.currentTarget) || !coinciden) return;
    const fd = new FormData();
    fd.append("password", password);
    fd.append("confirmar", confirmar);
    fd.append("token_hash", tokenHash);
    ejecutar(async () => {
      // En el éxito la acción redirige al login.
      const res = await textos.accion(null, fd);
      setState(res);
      if (res && !res.ok) {
        // Se limpian los campos para no reenviar valores viejos.
        setPassword("");
        setConfirmar("");
      }
    });
  }

  const inputBase =
    "w-full rounded-lg border bg-background py-2.5 pl-10 pr-10 text-sm text-foreground placeholder:text-placeholder outline-none transition";
  const inputFocus = "focus:bg-white focus:ring-2";
  const inputNormal = `border-border focus:border-primary ${inputFocus} focus:ring-primary/20`;
  const inputError = `border-danger focus:border-danger ${inputFocus} focus:ring-danger/20`;
  const inputOk = `border-border focus:border-primary ${inputFocus} focus:ring-primary/20`;

  const confirmarInputClass = `${inputBase} ${
    confirmarTocado && !coinciden ? inputError : inputOk
  }`;

  const tokenVencido = state && !state.ok && state.codigo === "TOKEN_VENCIDO";
  const errorRef = state && !state.ok && state.codigo === "ERROR_INTERNO" ? state.ref : undefined;

  return (
    <div className="w-full">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Lock className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {textos.titulo}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {textos.descripcion}
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">

        {/* Nueva contraseña */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="nueva-password"
            className="text-sm font-medium text-foreground"
          >
            {textos.etiqueta} <Obligatorio />
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
              onChange={(e) => {
                setPassword(e.target.value);
                campos.limpiar("password");
              }}
              placeholder="Mínimo 6 caracteres"
              {...ariaErrorCampo("nueva-password", errorCampo("password"))}
              className={`${inputBase} ${inputNormal} ${CLASE_CONTROL_INVALIDO}`}
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
          <ErrorCampo idCampo="nueva-password" mensaje={errorCampo("password")} />
        </div>

        {/* Repetir contraseña */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="confirmar-password"
            className="text-sm font-medium text-foreground"
          >
            Repetir contraseña <Obligatorio />
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
              onChange={(e) => {
                setConfirmar(e.target.value);
                campos.limpiar("confirmar");
              }}
              placeholder="Repetí la contraseña"
              {...ariaErrorCampo("confirmar-password", errorCampo("confirmar"))}
              className={`${confirmarInputClass} ${CLASE_CONTROL_INVALIDO}`}
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
          <ErrorCampo idCampo="confirmar-password" mensaje={errorCampo("confirmar")} />

          {/* Feedback en vivo */}
          {confirmarTocado && (
            <p
              className={`flex items-center gap-1 text-xs ${
                coinciden ? "text-success" : "text-danger"
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
        {stateError && !campoServidor && (
          <Aviso tono="danger">
            <p>{stateError}</p>
            {errorRef && (
              <p className="mt-1 text-sm">
                Si el problema sigue, comunicate con la Oficina de Empleo e indicá este código: {errorRef}
              </p>
            )}
            {tokenVencido && (
              <Link href={textos.linkVencido.href} className="mt-1 inline-block">
                {textos.linkVencido.texto}
              </Link>
            )}
          </Aviso>
        )}

        <button
          type="submit"
          disabled={isPending}
          aria-busy={isPending}
          className="mt-1 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? <Spinner /> : <Lock className="h-4 w-4" />}
          {isPending ? "Guardando…" : "Guardar contraseña"}
        </button>
      </form>
    </div>
  );
}
