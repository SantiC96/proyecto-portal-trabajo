"use client";

import { Mail, Send } from "lucide-react";
import { solicitarResetContrasena } from "@/app/auth/actions";
import { SubmitButton } from "@/components/auth/submit-button";
import {
  CLASE_CONTROL_INVALIDO,
  ErrorCampo,
  Obligatorio,
  ariaErrorCampo,
} from "@/components/ui/obligatorio";
import { useErroresCampo } from "@/lib/use-errores-campo";
import { cn } from "@/lib/utils";

export function RecuperarContrasenaForm() {
  const campos = useErroresCampo<"email">();

  return (
    <form
      action={solicitarResetContrasena}
      noValidate
      onSubmit={(e) => {
        const email = new FormData(e.currentTarget).get("email");
        if (!campos.validar({ email }, e.currentTarget)) e.preventDefault();
      }}
      className="flex flex-col gap-5"
    >
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
            onChange={() => campos.limpiar("email")}
            {...ariaErrorCampo("reset-email", campos.errores.email)}
            className={cn(
              "w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-placeholder outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20",
              CLASE_CONTROL_INVALIDO
            )}
          />
        </div>
        <ErrorCampo idCampo="reset-email" mensaje={campos.errores.email} />
      </div>

      <SubmitButton pendingText="Enviando enlace…" icon={<Send className="h-4 w-4" />}>
        Enviar enlace
      </SubmitButton>
    </form>
  );
}
