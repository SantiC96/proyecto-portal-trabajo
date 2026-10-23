"use client";

import { useState } from "react";
import { registrarEmpresa } from "@/app/auth/actions";
import { toErrorAccion, type ErrorAccion } from "@/lib/resultado";
import { formatearCUIT } from "@/lib/cuit";
import { LARGO_MAXIMO, validarCuitConMensaje } from "@/lib/validaciones";
import { ContadorCaracteres } from "@/components/ui/contador-caracteres";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import type { Tabla } from "@/types/db";
import { useErroresCampo } from "@/lib/use-errores-campo";
import { useAccion } from "@/lib/use-accion";
import { Aviso } from "@/components/ui/aviso";
import { SeccionNumerada } from "@/components/ui/seccion-numerada";
import { cn } from "@/lib/utils";
import {
  CampoRegistro,
  EncabezadoRegistro,
  GrillaCampos,
  PieRegistro,
  SeccionAcceso,
  ariaCampo,
  idAyudaCampo,
} from "@/components/auth/partes-registro";

const CAMPOS = [
  "razonSocial",
  "cuit",
  "rubro",
  "descripcion",
  "nombre",
  "apellido",
  "telefono",
  "email",
  "password",
  "passwordRepeat",
] as const;
type Campo = (typeof CAMPOS)[number];

interface Props {
  categorias: Tabla<"categorias">[];
}

export function RegistroEmpresaForm({ categorias }: Props) {
  const [razonSocial, setRazonSocial] = useState("");
  const [cuit, setCuit] = useState(""); // raw 11 digits
  const [rubro, setRubro] = useState("");
  const [descripcion, setDescripcion] = useState("");

  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordRepeat, setPasswordRepeat] = useState("");

  const { pendiente: isLoading, ejecutar } = useAccion();
  const [submitError, setSubmitError] = useState<ErrorAccion | null>(null);
  const campos = useErroresCampo<Campo>();

  const passwordRepeatError = passwordRepeat !== "" && password !== passwordRepeat;
  const cuitCompleto = cuit.length === 11;
  const cuitError = cuitCompleto && validarCuitConMensaje(cuit) !== null;
  const cuitValido = cuitCompleto && validarCuitConMensaje(cuit) === null;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitError(null);

    const completos = campos.validar(
      { razonSocial, cuit, rubro, nombre, apellido, telefono, email, password, passwordRepeat },
      e.currentTarget
    );
    if (!completos) return;

    if (password !== passwordRepeat) {
      setSubmitError({ mensaje: "Las contraseñas no coinciden." });
      return;
    }
    const cuitErrMsg = validarCuitConMensaje(cuit);
    if (cuitErrMsg) {
      campos.marcar("cuit", cuitErrMsg);
      return;
    }

    setSubmitError(null);
    // En el éxito la acción redirige a la página de verificación del email.
    ejecutar(async () => {
      const result = await registrarEmpresa({
        razonSocial,
        cuit,
        rubro,
        descripcion,
        nombre,
        apellido,
        telefono,
        email,
        password,
      });
      if (result && !result.ok && !campos.tomarDelServidor(result, CAMPOS)) {
        setSubmitError(toErrorAccion(result));
      }
    });
  };

  return (
    <div className="w-full">
      <EncabezadoRegistro titulo="Registrar tu empresa" />

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-8">
        <SeccionNumerada numero={1} id="seccion-empresa" titulo="Datos de la empresa" variante="plana">
          <GrillaCampos>
            <CampoRegistro
              id="reg-razon-social"
              etiqueta="Razón social"
              obligatorio
              error={campos.errores.razonSocial}
            >
              <input
                id="reg-razon-social"
                type="text"
                autoComplete="organization"
                required
                value={razonSocial}
                onChange={(e) => {
                  setRazonSocial(e.target.value);
                  campos.limpiar("razonSocial");
                }}
                placeholder="Ej: Construcciones del Sur S.R.L."
                className="campo"
                {...ariaCampo("reg-razon-social", campos.errores.razonSocial)}
              />
            </CampoRegistro>

            <CampoRegistro id="reg-cuit" etiqueta="CUIT" obligatorio error={campos.errores.cuit}>
              <input
                id="reg-cuit"
                type="text"
                inputMode="numeric"
                required
                value={formatearCUIT(cuit)}
                onChange={(e) => {
                  setCuit(e.target.value.replace(/\D/g, "").slice(0, 11));
                  campos.limpiar("cuit");
                }}
                placeholder="30-12345678-9"
                className={cn(
                  "campo tabular-nums",
                  cuitError && "border-danger! shadow-[var(--sombra-error-campo)]!",
                )}
                {...ariaCampo("reg-cuit", campos.errores.cuit)}
              />
              <div aria-live="polite">
                {cuitError && (
                  <p className="flex items-center gap-1.5 text-sm text-danger">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    CUIT inválido. Verificá el dígito verificador.
                  </p>
                )}
                {cuitValido && (
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-primary">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    CUIT válido
                  </p>
                )}
              </div>
            </CampoRegistro>

            <CampoRegistro
              id="reg-rubro"
              etiqueta="Rubro"
              obligatorio
              error={campos.errores.rubro}
            >
              <select
                id="reg-rubro"
                required
                value={rubro}
                onChange={(e) => {
                  setRubro(e.target.value);
                  campos.limpiar("rubro");
                }}
                className="campo cursor-pointer"
                {...ariaCampo("reg-rubro", campos.errores.rubro)}
              >
                <option value="" disabled>
                  Seleccioná un rubro…
                </option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.nombre}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </CampoRegistro>

            <div className="flex min-w-0 flex-col gap-1.5 sm:col-span-2">
              <label htmlFor="reg-descripcion" className="etiqueta-campo">
                Descripción breve{" "}
                <span className="text-sm font-normal text-muted-foreground">(opcional)</span>
              </label>
              <textarea
                id="reg-descripcion"
                rows={3}
                value={descripcion}
                onChange={(e) => {
                  setDescripcion(e.target.value);
                  campos.limpiar("descripcion");
                }}
                placeholder="Contanos brevemente a qué se dedica tu empresa…"
                maxLength={LARGO_MAXIMO.descripcion}
                className="campo resize-y"
                {...ariaCampo("reg-descripcion", campos.errores.descripcion, true)}
              />
              <div className="flex items-start justify-between gap-3">
                <p id={idAyudaCampo("reg-descripcion")} className="text-sm text-muted-foreground">
                  Contá a qué se dedica la empresa. Lo ven los postulantes en tus ofertas.
                </p>
                <ContadorCaracteres
                  className="shrink-0 text-[13px]"
                  actual={descripcion.length}
                  maximo={LARGO_MAXIMO.descripcion}
                />
              </div>
              {campos.errores.descripcion && (
                <p id="reg-descripcion-error" className="flex items-start gap-1.5 text-sm text-danger">
                  <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {campos.errores.descripcion}
                </p>
              )}
            </div>
          </GrillaCampos>
        </SeccionNumerada>

        <hr className="border-tabla-borde" />

        <SeccionNumerada
          numero={2}
          id="seccion-responsable"
          titulo="Persona responsable"
          variante="plana"
        >
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
                placeholder="Ej: Carlos"
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
                placeholder="Ej: Ramírez"
                className="campo"
                {...ariaCampo("reg-apellido", campos.errores.apellido)}
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
          </GrillaCampos>
        </SeccionNumerada>

        <hr className="border-tabla-borde" />

        <SeccionAcceso
          numero={3}
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
          placeholderEmail="empresa@ejemplo.com"
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

        <PieRegistro
          id="reg-empresa-submit"
          pendiente={isLoading}
          deshabilitado={passwordRepeatError || cuitError}
        />
      </form>
    </div>
  );
}
