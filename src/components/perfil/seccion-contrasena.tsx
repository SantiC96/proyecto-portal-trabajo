"use client";

import { useState } from "react";
import { CheckCircle2, Eye, EyeOff, KeyRound } from "lucide-react";
import { cambiarContrasena } from "@/app/(dashboard)/perfil/actions";
import { mostrarAviso } from "@/lib/avisos";
import { useAccion } from "@/lib/use-accion";
import { useErroresCampo } from "@/lib/use-errores-campo";
import { Spinner } from "@/components/ui/spinner";
import { ErrorCampo, Obligatorio, ariaErrorCampo } from "@/components/ui/obligatorio";
import { FieldIcon, InputWrapper, inputClassPassword } from "@/components/perfil/piezas";

type CampoContrasena = "contrasenaActual" | "contrasenaNueva" | "repetirContrasena";

const CAMPOS_CONTRASENA: readonly CampoContrasena[] = [
  "contrasenaActual",
  "contrasenaNueva",
  "repetirContrasena",
];

/** Cambiar la contraseña desde "Mi perfil" (los tres roles). */
export function SeccionContrasena() {
  const [mostrarFormContrasena, setMostrarFormContrasena] = useState(false);
  const [contrasenaActual, setContrasenaActual] = useState("");
  const [contrasenaNueva, setContrasenaNueva] = useState("");
  const [repetirContrasena, setRepetirContrasena] = useState("");
  const [mostrarActual, setMostrarActual] = useState(false);
  const [mostrarNueva, setMostrarNueva] = useState(false);
  const [mostrarRepetir, setMostrarRepetir] = useState(false);
  const { pendiente: cargandoContrasena, ejecutar: ejecutarContrasena } = useAccion();
  const camposContrasena = useErroresCampo<CampoContrasena>();

  const handleCambiarContrasena = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const completos = camposContrasena.validar(
      { contrasenaActual, contrasenaNueva, repetirContrasena },
      e.currentTarget
    );
    if (!completos) return;
    const fd = new FormData();
    fd.append("contrasenaActual", contrasenaActual);
    fd.append("contrasenaNueva", contrasenaNueva);
    fd.append("repetirContrasena", repetirContrasena);
    ejecutarContrasena(async () => {
      // Un solo aviso: el error de un campo va debajo de ese campo; el resto, en el toast.
      const res = await cambiarContrasena(fd);
      if (!camposContrasena.tomarDelServidor(res, CAMPOS_CONTRASENA)) mostrarAviso(res);
      if (!res.ok) return;
      setMostrarFormContrasena(false);
      setContrasenaActual("");
      setContrasenaNueva("");
      setRepetirContrasena("");
    });
  };

  const handleCancelarContrasena = () => {
    setMostrarFormContrasena(false);
    setContrasenaActual("");
    setContrasenaNueva("");
    setRepetirContrasena("");
    camposContrasena.limpiarTodos();
  };

  return (
    <div className="rounded-2xl border border-border bg-white px-4 py-5 shadow-sm sm:px-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-foreground">Contraseña</p>
          <p className="text-xs text-muted-foreground">Cambiá tu contraseña de acceso.</p>
        </div>
        {!mostrarFormContrasena && (
          <button
            type="button"
            onClick={() => setMostrarFormContrasena(true)}
            className="btn-secundario inline-flex min-h-11 shrink-0 items-center gap-1.5 px-4 text-sm font-medium sm:min-h-9"
          >
            <KeyRound className="h-4 w-4" />
            Cambiar contraseña
          </button>
        )}
      </div>

      {mostrarFormContrasena && (
        <form onSubmit={handleCambiarContrasena} noValidate className="mt-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="p-contrasena-actual" className="text-sm font-medium text-foreground">
              Contraseña actual <Obligatorio />
            </label>
            <InputWrapper>
              <FieldIcon icon={KeyRound} />
              <input
                id="p-contrasena-actual"
                type={mostrarActual ? "text" : "password"}
                autoComplete="current-password"
                required
                value={contrasenaActual}
                onChange={(e) => {
                  setContrasenaActual(e.target.value);
                  camposContrasena.limpiar("contrasenaActual");
                }}
                placeholder="Tu contraseña actual"
                className={inputClassPassword}
                {...ariaErrorCampo("p-contrasena-actual", camposContrasena.errores.contrasenaActual)}
              />
              <button
                type="button"
                onClick={() => setMostrarActual((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-icon transition hover:text-foreground"
                aria-label={mostrarActual ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {mostrarActual ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </InputWrapper>
            <ErrorCampo idCampo="p-contrasena-actual" mensaje={camposContrasena.errores.contrasenaActual} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="p-contrasena-nueva" className="text-sm font-medium text-foreground">
              Contraseña nueva <Obligatorio />
            </label>
            <InputWrapper>
              <FieldIcon icon={KeyRound} />
              <input
                id="p-contrasena-nueva"
                type={mostrarNueva ? "text" : "password"}
                autoComplete="new-password"
                required
                value={contrasenaNueva}
                onChange={(e) => {
                  setContrasenaNueva(e.target.value);
                  camposContrasena.limpiar("contrasenaNueva");
                }}
                placeholder="Mínimo 6 caracteres"
                className={inputClassPassword}
                {...ariaErrorCampo("p-contrasena-nueva", camposContrasena.errores.contrasenaNueva)}
              />
              <button
                type="button"
                onClick={() => setMostrarNueva((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-icon transition hover:text-foreground"
                aria-label={mostrarNueva ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {mostrarNueva ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </InputWrapper>
            <ErrorCampo idCampo="p-contrasena-nueva" mensaje={camposContrasena.errores.contrasenaNueva} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="p-repetir-contrasena" className="text-sm font-medium text-foreground">
              Repetir contraseña nueva <Obligatorio />
            </label>
            <InputWrapper>
              <FieldIcon icon={KeyRound} />
              <input
                id="p-repetir-contrasena"
                type={mostrarRepetir ? "text" : "password"}
                autoComplete="new-password"
                required
                value={repetirContrasena}
                onChange={(e) => {
                  setRepetirContrasena(e.target.value);
                  camposContrasena.limpiar("repetirContrasena");
                }}
                placeholder="Repetí la contraseña nueva"
                className={inputClassPassword}
                {...ariaErrorCampo("p-repetir-contrasena", camposContrasena.errores.repetirContrasena)}
              />
              <button
                type="button"
                onClick={() => setMostrarRepetir((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-icon transition hover:text-foreground"
                aria-label={mostrarRepetir ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {mostrarRepetir ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </InputWrapper>
            <ErrorCampo idCampo="p-repetir-contrasena" mensaje={camposContrasena.errores.repetirContrasena} />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="submit"
              disabled={cargandoContrasena}
              aria-busy={cargandoContrasena}
              className="btn-primario min-h-11 justify-center px-6"
            >
              {cargandoContrasena ? <Spinner /> : <CheckCircle2 className="h-4 w-4" />}
              {cargandoContrasena ? "Guardando…" : "Guardar contraseña"}
            </button>
            <button
              type="button"
              onClick={handleCancelarContrasena}
              disabled={cargandoContrasena}
              className="btn-secundario inline-flex min-h-11 items-center justify-center px-6 text-sm font-medium"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
