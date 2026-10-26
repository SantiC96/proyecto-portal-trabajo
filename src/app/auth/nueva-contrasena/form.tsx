"use client";

import { useState } from "react";
import Link from "next/link";
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react";
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
import { EncabezadoTarjetaAuth } from "@/components/auth/pantalla-auth";
import { cn } from "@/lib/utils";

type Campo = "password" | "confirmar";

// La misma pantalla sirve para recuperar la contraseña y para aceptar la
// invitación de la oficina (/auth/aceptar-invitacion), las dos en PantallaAuth
// con el encabezado del login; la invitación lleva además el candado arriba.
const VARIANTES = {
  recuperacion: {
    accion: restablecerContrasena,
    conIcono: false,
    titulo: "Elegí una contraseña nueva",
    descripcion: "Elegí una nueva contraseña para tu cuenta.",
    etiqueta: "Nueva contraseña",
    linkVencido: { href: "/auth/recuperar-contrasena", texto: "Pedir un link nuevo" },
  },
  invitacion: {
    accion: aceptarInvitacion,
    conIcono: true,
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

  const tokenVencido = state && !state.ok && state.codigo === "TOKEN_VENCIDO";
  const errorRef = state && !state.ok && state.codigo === "ERROR_INTERNO" ? state.ref : undefined;

  return (
    <div className="w-full">
      <EncabezadoTarjetaAuth
        className="mb-6"
        titulo={textos.titulo}
        bajada={textos.descripcion}
        icono={textos.conIcono && <Lock aria-hidden="true" />}
      />

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">

        {/* Nueva contraseña */}
        <div className="flex flex-col gap-2">
          <label htmlFor="nueva-password" className="etiqueta-campo">
            {textos.etiqueta} <Obligatorio />
          </label>
          <div className="login-campo">
            <Lock aria-hidden="true" className="login-campo-icono" />
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
              className={`campo login-input login-input--con-boton ${CLASE_CONTROL_INVALIDO}`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              className="login-ver-contrasena"
            >
              {showPassword ? (
                <EyeOff aria-hidden="true" className="h-5 w-5" />
              ) : (
                <Eye aria-hidden="true" className="h-5 w-5" />
              )}
            </button>
          </div>
          <ErrorCampo idCampo="nueva-password" mensaje={errorCampo("password")} />
        </div>

        {/* Repetir contraseña */}
        <div className="flex flex-col gap-2">
          <label htmlFor="confirmar-password" className="etiqueta-campo">
            Repetir contraseña <Obligatorio />
          </label>
          <div className="login-campo">
            <Lock aria-hidden="true" className="login-campo-icono" />
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
              className={cn(
                "campo login-input login-input--con-boton",
                CLASE_CONTROL_INVALIDO,
                confirmarTocado && !coinciden && "border-danger",
              )}
            />
            <button
              type="button"
              onClick={() => setShowConfirmar(!showConfirmar)}
              aria-label={showConfirmar ? "Ocultar contraseña" : "Mostrar contraseña"}
              className="login-ver-contrasena"
            >
              {showConfirmar ? (
                <EyeOff aria-hidden="true" className="h-5 w-5" />
              ) : (
                <Eye aria-hidden="true" className="h-5 w-5" />
              )}
            </button>
          </div>
          <ErrorCampo idCampo="confirmar-password" mensaje={errorCampo("confirmar")} />

          {/* Feedback en vivo */}
          {confirmarTocado && (
            <p
              className={cn(
                "flex items-center gap-1.5 text-sm",
                coinciden ? "font-semibold text-primary" : "text-danger",
              )}
            >
              {coinciden ? (
                <>
                  <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                  Las contraseñas coinciden
                </>
              ) : (
                <>
                  <AlertCircle aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
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
          className="btn-primario login-enviar"
        >
          {isPending ? <Spinner /> : <Lock aria-hidden="true" />}
          {isPending ? "Guardando…" : "Guardar contraseña"}
        </button>
      </form>
    </div>
  );
}
