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
import { cn } from "@/lib/utils";

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
      <div className="flex flex-col gap-1.5">
        <label htmlFor="reset-email" className="text-sm font-medium text-foreground">
          Correo electrónico <Obligatorio />
        </label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-icon" />
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
            className={cn(
              "w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-placeholder outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 disabled:opacity-60",
              CLASE_CONTROL_INVALIDO
            )}
          />
        </div>
        <ErrorCampo idCampo="reset-email" mensaje={campos.errores.email} />
      </div>

      <button
        type="submit"
        disabled={pendiente}
        aria-busy={pendiente}
        className="mt-1 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pendiente ? <Spinner /> : <Send className="h-4 w-4" />}
        {pendiente ? "Enviando enlace…" : "Enviar enlace"}
      </button>
    </form>
  );
}
