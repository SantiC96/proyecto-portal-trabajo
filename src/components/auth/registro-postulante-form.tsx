"use client";

import { useState } from "react";
import { registrarPostulante } from "@/app/auth/actions";
import { LARGO_MAXIMO, validarDNI } from "@/lib/validaciones";
import {
  LOCALIDAD_FUNES,
  OTRA_LOCALIDAD,
  esLocalidadFunes,
  validarLocalidadEscrita,
} from "@/lib/localidades";
import {
  COMPROBANTE_ACCEPT,
  COMPROBANTE_HELP_TEXT,
  COMPROBANTE_MAX_SIZE,
  ERRORES_ARCHIVO,
  textoTamanoArchivo,
  validarTipoComprobante,
} from "@/lib/archivos";
import { CampoLocalidad } from "@/components/postulantes/campo-localidad";
import { toErrorAccion, type ErrorAccion } from "@/lib/resultado";
import { FileText, Upload, X } from "lucide-react";
import { ErrorCampo, idErrorCampo } from "@/components/ui/obligatorio";
import { useErroresCampo } from "@/lib/use-errores-campo";
import { useAccion } from "@/lib/use-accion";
import { Aviso } from "@/components/ui/aviso";
import { SeccionNumerada } from "@/components/ui/seccion-numerada";
import {
  CampoRegistro,
  EncabezadoRegistro,
  GrillaCampos,
  PieRegistro,
  SeccionAcceso,
  ariaCampo,
} from "@/components/auth/partes-registro";

const CAMPOS = [
  "nombre",
  "apellido",
  "dni",
  "domicilio",
  "localidad",
  "otraLocalidad",
  "comprobante",
  "telefono",
  "email",
  "password",
  "passwordRepeat",
] as const;
type Campo = (typeof CAMPOS)[number];

export function RegistroPostulanteForm() {
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [dni, setDni] = useState("");
  const [domicilio, setDomicilio] = useState("");
  const [telefono, setTelefono] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordRepeat, setPasswordRepeat] = useState("");

  // Procedencia (migration_055)
  const [localidad, setLocalidad] = useState("");
  const [otraLocalidad, setOtraLocalidad] = useState("");
  const [comprobante, setComprobante] = useState<File | null>(null);

  const { pendiente: isLoading, ejecutar } = useAccion();
  const [submitError, setSubmitError] = useState<ErrorAccion | null>(null);
  const campos = useErroresCampo<Campo>();

  const passwordRepeatError = passwordRepeat !== "" && password !== passwordRepeat;
  const esDeFunes =
    localidad === LOCALIDAD_FUNES ||
    (localidad === OTRA_LOCALIDAD && esLocalidadFunes(otraLocalidad));

  const elegirLocalidad = (valor: string) => {
    setLocalidad(valor);
    campos.limpiar("localidad");
    campos.limpiar("otraLocalidad");
    if (valor !== LOCALIDAD_FUNES && valor !== OTRA_LOCALIDAD) {
      setComprobante(null);
      campos.limpiar("comprobante");
    }
  };

  const elegirComprobante = (file: File | undefined) => {
    campos.limpiar("comprobante");
    if (!file) return;
    if (!validarTipoComprobante(file.type)) {
      campos.marcar("comprobante", ERRORES_ARCHIVO.comprobanteTipo);
      return;
    }
    if (file.size > COMPROBANTE_MAX_SIZE) {
      campos.marcar("comprobante", ERRORES_ARCHIVO.comprobanteTamano);
      return;
    }
    setComprobante(file);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitError(null);

    const form = e.currentTarget;
    const completos = campos.validar(
      {
        nombre,
        apellido,
        dni,
        domicilio,
        localidad,
        ...(localidad === OTRA_LOCALIDAD ? { otraLocalidad } : {}),
        telefono,
        email,
        password,
        passwordRepeat,
      },
      form
    );
    if (!completos) return;

    if (password !== passwordRepeat) {
      setSubmitError({ mensaje: "Las contraseñas no coinciden." });
      return;
    }
    const dniError = validarDNI(dni);
    if (dniError) {
      campos.marcar("dni", dniError);
      return;
    }
    if (localidad === OTRA_LOCALIDAD) {
      const errorLocalidad = validarLocalidadEscrita(otraLocalidad);
      if (errorLocalidad) {
        campos.marcar("otraLocalidad", errorLocalidad, form);
        return;
      }
    }

    // El comprobante es opcional y solo para Funes.
    let archivos: FormData | undefined;
    if (esDeFunes && comprobante) {
      archivos = new FormData();
      archivos.append("comprobante", comprobante);
    }

    setSubmitError(null);
    // En el éxito la acción redirige a la página de verificación del email.
    ejecutar(async () => {
      const result = await registrarPostulante(
        {
          nombre,
          apellido,
          telefono,
          dni,
          domicilio,
          localidad,
          otraLocalidad,
          email,
          password,
        },
        archivos
      );
      if (result && !result.ok && !campos.tomarDelServidor(result, CAMPOS)) {
        setSubmitError(toErrorAccion(result));
      }
    });
  };

  return (
    <div className="w-full">
      <EncabezadoRegistro titulo="Registro de postulante" />

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-8">
        <SeccionNumerada numero={1} id="seccion-personales" titulo="Datos personales" variante="plana">
          <GrillaCampos>
            <CampoRegistro id="reg-nombre" etiqueta="Nombre" obligatorio error={campos.errores.nombre}>
              <input
                id="reg-nombre"
                type="text"
                autoComplete="given-name"
                required
                value={nombre}
                onChange={(e) => {
                  setNombre(e.target.value);
                  campos.limpiar("nombre");
                }}
                placeholder="Ej: María"
                className="campo"
                {...ariaCampo("reg-nombre", campos.errores.nombre)}
              />
            </CampoRegistro>

            <CampoRegistro id="reg-apellido" etiqueta="Apellido" obligatorio error={campos.errores.apellido}>
              <input
                id="reg-apellido"
                type="text"
                autoComplete="family-name"
                required
                value={apellido}
                onChange={(e) => {
                  setApellido(e.target.value);
                  campos.limpiar("apellido");
                }}
                placeholder="Ej: González"
                className="campo"
                {...ariaCampo("reg-apellido", campos.errores.apellido)}
              />
            </CampoRegistro>

            <CampoRegistro id="reg-dni" etiqueta="DNI" obligatorio error={campos.errores.dni}>
              <input
                id="reg-dni"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{7,8}"
                required
                value={dni}
                onChange={(e) => {
                  setDni(e.target.value.replace(/\D/g, "").slice(0, 8));
                  campos.limpiar("dni");
                }}
                placeholder="12345678"
                className="campo tabular-nums"
                {...ariaCampo("reg-dni", campos.errores.dni)}
              />
            </CampoRegistro>

            <CampoRegistro
              id="reg-telefono"
              etiqueta="Teléfono / Celular"
              obligatorio
              error={campos.errores.telefono}
            >
              <input
                id="reg-telefono"
                type="tel"
                autoComplete="tel"
                required
                value={telefono}
                onChange={(e) => {
                  setTelefono(e.target.value);
                  campos.limpiar("telefono");
                }}
                placeholder="Ej: 341 5678901"
                className="campo"
                {...ariaCampo("reg-telefono", campos.errores.telefono)}
              />
            </CampoRegistro>

            <CampoRegistro
              id="reg-domicilio"
              etiqueta="Domicilio"
              obligatorio
              ayuda="Calle y número."
              error={campos.errores.domicilio}
              className="sm:col-span-2"
            >
              <input
                id="reg-domicilio"
                type="text"
                autoComplete="street-address"
                required
                value={domicilio}
                onChange={(e) => {
                  setDomicilio(e.target.value);
                  campos.limpiar("domicilio");
                }}
                placeholder="Ej: San Martín 432"
                maxLength={LARGO_MAXIMO.domicilio}
                className="campo"
                {...ariaCampo("reg-domicilio", campos.errores.domicilio, true)}
              />
            </CampoRegistro>

            <CampoLocalidad
              id="reg-localidad"
              className="sm:col-span-2"
              estiloPerfil
              elegida={localidad}
              escrita={otraLocalidad}
              onElegida={elegirLocalidad}
              onEscrita={(valor) => {
                setOtraLocalidad(valor);
                campos.limpiar("otraLocalidad");
              }}
              errorLocalidad={campos.errores.localidad}
              errorOtra={campos.errores.otraLocalidad}
            />

            {esDeFunes && (
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label htmlFor="reg-comprobante" className="etiqueta-campo">
                  Comprobante de domicilio{" "}
                  <span className="text-sm font-normal text-muted-foreground">(opcional)</span>
                </label>
                <p id="reg-comprobante-ayuda" className="text-sm text-muted-foreground">
                  Cualquier documento donde figure tu dirección en Funes (por ejemplo, una
                  factura de un servicio). Lo revisa la Oficina de Empleo.
                </p>
                <p className="text-sm font-semibold text-primary-hover">
                  Con el comprobante aprobado tenés prioridad en la Oficina de Empleo.
                </p>
                {comprobante ? (
                  <div className="flex items-center gap-3 rounded-[var(--radius-lg)] border-[1.5px] border-border-strong bg-surface-tinted px-3.5 py-2">
                    <FileText className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-semibold break-all text-foreground">
                        {comprobante.name}
                      </p>
                      <p className="text-[13px] text-muted-foreground">
                        {textoTamanoArchivo(comprobante.size)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setComprobante(null)}
                      disabled={isLoading}
                      className="btn-neutro shrink-0"
                    >
                      <X aria-hidden="true" />
                      Quitar
                    </button>
                  </div>
                ) : (
                  <label
                    className={
                      "flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-[var(--radius-lg)] border-[1.5px] border-dashed border-border-strong bg-surface-tinted px-4 py-5 text-center transition-colors hover:border-primary has-[:focus-visible]:shadow-[var(--sombra-foco)] has-[[aria-invalid=true]]:border-danger"
                    }
                  >
                    <Upload className="size-6 text-primary" aria-hidden="true" />
                    <span className="text-[15px] font-bold text-primary">Elegí un archivo</span>
                    <span className="text-[13px] text-muted-foreground">{COMPROBANTE_HELP_TEXT}</span>
                    <input
                      id="reg-comprobante"
                      type="file"
                      accept={COMPROBANTE_ACCEPT}
                      onChange={(e) => {
                        elegirComprobante(e.target.files?.[0]);
                        e.target.value = "";
                      }}
                      aria-invalid={campos.errores.comprobante ? true : undefined}
                      aria-describedby={
                        campos.errores.comprobante
                          ? `reg-comprobante-ayuda ${idErrorCampo("reg-comprobante")}`
                          : "reg-comprobante-ayuda"
                      }
                      className="sr-only"
                    />
                  </label>
                )}
                <ErrorCampo idCampo="reg-comprobante" mensaje={campos.errores.comprobante} />
              </div>
            )}
          </GrillaCampos>
        </SeccionNumerada>

        <hr className="border-tabla-borde" />

        <SeccionAcceso
          numero={2}
          email={email}
          password={password}
          passwordRepeat={passwordRepeat}
          onEmail={(v) => {
            setEmail(v);
            campos.limpiar("email");
          }}
          onPassword={(v) => {
            setPassword(v);
            campos.limpiar("password");
          }}
          onPasswordRepeat={(v) => {
            setPasswordRepeat(v);
            campos.limpiar("passwordRepeat");
          }}
          errores={campos.errores}
          placeholderEmail="tucorreo@ejemplo.com"
        />

        {submitError && (
          <Aviso tono="danger">
            <p>{submitError.mensaje}</p>
            {submitError.ref && (
              <p className="mt-1 text-sm">
                Si el problema sigue, comunicate con la Oficina de Empleo e indicá este código: {submitError.ref}
              </p>
            )}
          </Aviso>
        )}

        <PieRegistro id="reg-postulante-submit" pendiente={isLoading} deshabilitado={passwordRepeatError} />
      </form>
    </div>
  );
}
