"use client";

import { useState } from "react";
import { Mail, Send } from "lucide-react";
import { solicitarResetContrasena } from "@/app/auth/actions";
import { Spinner } from "@/components/ui/spinner";
import {
  CLASE_CONTROL_INVALIDO,
  ErrorCampo,
  Obligatorio,
  ariaErrorCampo,
} from "@/components/ui/obligatorio";
import { useAccion } from "@/lib/use-accion";
import { useErroresCampo } from "@/lib/use-errores-campo";

export function RecuperarContrasenaForm() {
  const [email, setEmail] = useState("");
  const campos = useErroresCampo<"email">();
  const { pendiente, ejecutar } = useAccion();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!campos.validar({ email }, e.currentTarget)) return;
    const fd = new FormData();
    fd.append("email", email);
    // La acción siempre redirige a la página de "revisá tu correo".
    ejecutar(() => solicitarResetContrasena(fd));
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label htmlFor="reset-email" className="etiqueta-campo">
          Correo electrónico <Obligatorio />
        </label>
        <div className="login-campo">
          <Mail aria-hidden="true" className="login-campo-icono" />
          <input
            id="reset-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="tucorreo@ejemplo.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              campos.limpiar("email");
            }}
            disabled={pendiente}
            {...ariaErrorCampo("reset-email", campos.errores.email)}
            className={`campo login-input ${CLASE_CONTROL_INVALIDO}`}
          />
        </div>
        <ErrorCampo idCampo="reset-email" mensaje={campos.errores.email} />
      </div>

      <button
        type="submit"
        disabled={pendiente}
        aria-busy={pendiente}
        className="btn-primario login-enviar"
      >
        {pendiente ? <Spinner /> : <Send aria-hidden="true" />}
        {pendiente ? "Enviando enlace…" : "Enviar enlace"}
      </button>
    </form>
  );
}
