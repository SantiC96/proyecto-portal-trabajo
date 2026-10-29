"use client";

import { useState } from "react";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import { cambiarContrasena } from "@/app/(dashboard)/perfil/actions";
import { mostrarAviso } from "@/lib/avisos";
import { useAccion } from "@/lib/use-accion";
import { useErroresCampo } from "@/lib/use-errores-campo";
import { Spinner } from "@/components/ui/spinner";
import { ErrorCampo, Obligatorio, ariaErrorCampo } from "@/components/ui/obligatorio";
import {
  CLASE_CAMPO_CON_ICONO,
  CLASE_ERROR_PERFIL,
  CLASE_ETIQUETA_PERFIL,
  FieldIcon,
  InputWrapper,
  PieSeccion,
  SeccionPerfil,
} from "@/components/perfil/piezas";
import {
  BotonEditar,
  useInformarCambios,
  useTarjetaEditable,
  type TarjetaEditable,
} from "@/components/perfil/tarjeta-editable";

type CampoContrasena = "contrasenaActual" | "contrasenaNueva" | "repetirContrasena";

const CAMPOS_CONTRASENA: readonly CampoContrasena[] = [
  "contrasenaActual",
  "contrasenaNueva",
  "repetirContrasena",
];

const CLASE_CAMPO_CONTRASENA = `${CLASE_CAMPO_CON_ICONO} pr-12`;

const CLASE_VER_CONTRASENA =
  "absolute right-0.5 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-[var(--radius-md)] text-muted-icon outline-none transition hover:text-foreground focus-visible:shadow-[var(--sombra-foco)]";

/**
 * Cambiar la contraseña desde "Mi perfil" (los tres roles): el botón
 * "Cambiar contraseña" despliega el formulario. En el perfil del postulante
 * (dentro de EdicionPerfil) cuenta como una tarjeta más en edición.
 */
export function SeccionContrasena({ id = "contrasena" }: { id?: string }) {
  const tarjeta = useTarjetaEditable(id, { titulo: "Contraseña" });

  return (
    <SeccionPerfil
      id={id}
      titulo="Contraseña"
      ayuda="Cambiá tu contraseña de acceso."
      acciones={
        !tarjeta.editando && (
          <BotonEditar
            tarjeta={tarjeta}
            texto="Cambiar contraseña"
            icono={KeyRound}
            className="btn-secundario"
          />
        )
      }
    >
      {tarjeta.editando && <FormContrasena tarjeta={tarjeta} />}
    </SeccionPerfil>
  );
}

function FormContrasena({ tarjeta }: { tarjeta: TarjetaEditable }) {
  const [contrasenaActual, setContrasenaActual] = useState("");
  const [contrasenaNueva, setContrasenaNueva] = useState("");
  const [repetirContrasena, setRepetirContrasena] = useState("");
  const [mostrarActual, setMostrarActual] = useState(false);
  const [mostrarNueva, setMostrarNueva] = useState(false);
  const [mostrarRepetir, setMostrarRepetir] = useState(false);
  const { pendiente: cargandoContrasena, ejecutar: ejecutarContrasena } = useAccion();
  const camposContrasena = useErroresCampo<CampoContrasena>();
  useInformarCambios(tarjeta, Boolean(contrasenaActual || contrasenaNueva || repetirContrasena));

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
      tarjeta.cerrar();
    });
  };

  return (
    <form id={tarjeta.idFormulario} onSubmit={handleCambiarContrasena} noValidate className="@container flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 @2xl:grid-cols-2 @4xl:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="p-contrasena-actual" className={CLASE_ETIQUETA_PERFIL}>
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
              className={CLASE_CAMPO_CONTRASENA}
              {...ariaErrorCampo("p-contrasena-actual", camposContrasena.errores.contrasenaActual)}
            />
            <button
              type="button"
              onClick={() => setMostrarActual((v) => !v)}
              className={CLASE_VER_CONTRASENA}
              aria-label={mostrarActual ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {mostrarActual ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </InputWrapper>
          <ErrorCampo idCampo="p-contrasena-actual" mensaje={camposContrasena.errores.contrasenaActual} className={CLASE_ERROR_PERFIL} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="p-contrasena-nueva" className={CLASE_ETIQUETA_PERFIL}>
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
              className={CLASE_CAMPO_CONTRASENA}
              {...ariaErrorCampo("p-contrasena-nueva", camposContrasena.errores.contrasenaNueva)}
            />
            <button
              type="button"
              onClick={() => setMostrarNueva((v) => !v)}
              className={CLASE_VER_CONTRASENA}
              aria-label={mostrarNueva ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {mostrarNueva ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </InputWrapper>
          <ErrorCampo idCampo="p-contrasena-nueva" mensaje={camposContrasena.errores.contrasenaNueva} className={CLASE_ERROR_PERFIL} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="p-repetir-contrasena" className={CLASE_ETIQUETA_PERFIL}>
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
              className={CLASE_CAMPO_CONTRASENA}
              {...ariaErrorCampo("p-repetir-contrasena", camposContrasena.errores.repetirContrasena)}
            />
            <button
              type="button"
              onClick={() => setMostrarRepetir((v) => !v)}
              className={CLASE_VER_CONTRASENA}
              aria-label={mostrarRepetir ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {mostrarRepetir ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </InputWrapper>
          <ErrorCampo idCampo="p-repetir-contrasena" mensaje={camposContrasena.errores.repetirContrasena} className={CLASE_ERROR_PERFIL} />
        </div>
      </div>

      <PieSeccion>
        <button
          type="button"
          onClick={tarjeta.cerrar}
          disabled={cargandoContrasena}
          className="btn-neutro"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={cargandoContrasena}
          aria-busy={cargandoContrasena}
          className="btn-primario"
        >
          {cargandoContrasena && <Spinner />}
          {cargandoContrasena ? "Guardando…" : "Guardar contraseña"}
        </button>
      </PieSeccion>
    </form>
  );
}
