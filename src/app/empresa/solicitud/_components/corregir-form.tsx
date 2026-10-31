"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Hash,
  Briefcase,
  User,
  Phone,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { formatearCUIT } from "@/lib/cuit";
import { LARGO_MAXIMO, validarCuitConMensaje, validarTelefono } from "@/lib/validaciones";
import { ContadorCaracteres } from "@/components/ui/contador-caracteres";
import { Combobox } from "@/components/ui/combobox";
import { reenviarSolicitudEmpresa } from "@/app/empresa/actions";
import { toErrorAccion, type ErrorAccion } from "@/lib/resultado";
import { useAccion } from "@/lib/use-accion";
import type { Tabla } from "@/types/db";
import {
  CLASE_CONTROL_INVALIDO,
  ErrorCampo,
  Obligatorio,
  ariaErrorCampo,
} from "@/components/ui/obligatorio";
import { useErroresCampo } from "@/lib/use-errores-campo";
import { Aviso } from "@/components/ui/aviso";

const CAMPOS = [
  "razonSocial",
  "cuit",
  "rubro",
  "descripcion",
  "nombre",
  "apellido",
  "telefono",
] as const;

// ─── helpers ────────────────────────────────────────────────────────────────

function InputWrapper({ children }: { children: React.ReactNode }) {
  return <div className="relative">{children}</div>;
}

function FieldIcon({ icon: Icon }: { icon: React.ElementType }) {
  return (
    <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-icon" />
  );
}

const inputClass =
  "w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-placeholder outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60 " +
  CLASE_CONTROL_INVALIDO;

// Disparador del Combobox de rubro: mismo aspecto que los inputs de al lado.
const selectClass =
  "w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-3 text-sm text-foreground outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer " +
  CLASE_CONTROL_INVALIDO;

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-primary">
      {children}
    </h2>
  );
}

// ─── types ──────────────────────────────────────────────────────────────────

export type DatosIniciales = {
  razonSocial: string;
  cuit: string;
  rubro: string;
  descripcion: string;
  nombre: string;
  apellido: string;
  telefono: string;
  motivoRechazo: string | null;
  rubros: Tabla<"categorias">[];
};

// ─── component ──────────────────────────────────────────────────────────────

export function CorregirSolicitudForm({ datos }: { datos: DatosIniciales }) {
  const router = useRouter();

  const [razonSocial, setRazonSocial] = useState(datos.razonSocial);
  const [cuit, setCuit] = useState(datos.cuit.replace(/\D/g, ""));
  const [rubro, setRubro] = useState(datos.rubro);
  const [descripcion, setDescripcion] = useState(datos.descripcion);
  const [nombre, setNombre] = useState(datos.nombre);
  const [apellido, setApellido] = useState(datos.apellido);
  const [telefono, setTelefono] = useState(datos.telefono ?? "");
  const campos = useErroresCampo<(typeof CAMPOS)[number]>();

  const [submitError, setSubmitError] = useState<ErrorAccion | null>(null);
  const { pendiente: isPending, ejecutar } = useAccion();

  const cuitCompleto = cuit.length === 11;
  const cuitError = cuitCompleto && validarCuitConMensaje(cuit) !== null;
  const cuitValido = cuitCompleto && validarCuitConMensaje(cuit) === null;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitError(null);

    const completos = campos.validar(
      { razonSocial, cuit, rubro, nombre, apellido, telefono },
      e.currentTarget
    );
    if (!completos) return;

    const errTelefono = validarTelefono(telefono);
    if (errTelefono) {
      campos.marcar("telefono", errTelefono);
      document.getElementById("sol-telefono")?.focus();
      return;
    }

    ejecutar(async () => {
      const result = await reenviarSolicitudEmpresa({
        razonSocial,
        cuit,
        rubro,
        descripcion,
        nombre,
        apellido,
        telefono,
      });

      if (!result.ok) {
        if (!campos.tomarDelServidor(result, CAMPOS)) setSubmitError(toErrorAccion(result));
      } else {
        router.push("/empresa?aviso=reenviada");
      }
    });
  }

  return (
    <div className="@container w-full">
      {/* Motivo del rechazo */}
      {datos.motivoRechazo && (
        <Aviso tono="danger" titulo="Motivo del rechazo:" role="none" className="mb-6">
          {datos.motivoRechazo}
        </Aviso>
      )}

      <form
        onSubmit={handleSubmit}
        noValidate
        className="flex flex-col gap-6 rounded-2xl border border-border bg-white px-4 py-6 shadow-sm sm:px-7 sm:py-8"
      >
        {/* ── 1. Datos de la empresa ────────────────────────────────── */}
        <section>
          <SectionTitle>Datos de la empresa</SectionTitle>
          <div className="grid grid-cols-1 gap-4 @2xl:grid-cols-2 @5xl:grid-cols-3">
            {/* Razón social */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="sol-razon-social"
                className="text-sm font-medium text-foreground"
              >
                Razón social <Obligatorio />
              </label>
              <InputWrapper>
                <FieldIcon icon={Building2} />
                <input
                  id="sol-razon-social"
                  type="text"
                  autoComplete="organization"
                  required
                  value={razonSocial}
                  onChange={(e) => {
                    setRazonSocial(e.target.value);
                    campos.limpiar("razonSocial");
                  }}
                  placeholder="Ej: Construcciones del Sur S.R.L."
                  className={inputClass}
                  disabled={isPending}
                  {...ariaErrorCampo("sol-razon-social", campos.errores.razonSocial)}
                />
              </InputWrapper>
              <ErrorCampo idCampo="sol-razon-social" mensaje={campos.errores.razonSocial} />
            </div>

            {/* CUIT */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="sol-cuit"
                className="text-sm font-medium text-foreground"
              >
                CUIT <Obligatorio />
              </label>
              <InputWrapper>
                <FieldIcon icon={Hash} />
                <input
                  id="sol-cuit"
                  type="text"
                  inputMode="numeric"
                  required
                  value={formatearCUIT(cuit)}
                  onChange={(e) => {
                    setCuit(e.target.value.replace(/\D/g, "").slice(0, 11));
                    campos.limpiar("cuit");
                  }}
                  placeholder="30-12345678-9"
                  className={`${inputClass} ${
                    cuitError
                      ? "border-danger focus:border-danger focus:ring-danger/20"
                      : ""
                  }`}
                  disabled={isPending}
                  {...ariaErrorCampo("sol-cuit", campos.errores.cuit)}
                />
              </InputWrapper>
              <ErrorCampo idCampo="sol-cuit" mensaje={campos.errores.cuit} />
              {cuitError && (
                <p className="flex items-center gap-1.5 text-xs text-danger">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  CUIT inválido. Verificá el dígito verificador.
                </p>
              )}
              {cuitValido && (
                <p className="flex items-center gap-1.5 text-xs text-primary">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  CUIT válido.
                </p>
              )}
            </div>

            {/* Rubro */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="sol-rubro"
                className="text-sm font-medium text-foreground"
              >
                Rubro <Obligatorio />
              </label>
              <InputWrapper>
                <FieldIcon icon={Briefcase} />
                <Combobox
                  id="sol-rubro"
                  requerido
                  opciones={datos.rubros.map((c) => ({ id: c.nombre, nombre: c.nombre }))}
                  valor={rubro}
                  onCambiar={(valor) => {
                    setRubro(valor);
                    campos.limpiar("rubro");
                  }}
                  deshabilitado={isPending}
                  placeholder="Seleccioná un rubro…"
                  placeholderBusqueda="Buscar rubro"
                  etiquetaBusqueda="Buscar rubro"
                  vacioTexto="No hay rubros con ese nombre"
                  triggerClassName={selectClass}
                  {...ariaErrorCampo("sol-rubro", campos.errores.rubro)}
                />
              </InputWrapper>
              <ErrorCampo idCampo="sol-rubro" mensaje={campos.errores.rubro} />
            </div>

            {/* Descripción */}
            <div className="flex flex-col gap-1.5 @2xl:col-span-2 @5xl:col-span-3">
              <label
                htmlFor="sol-descripcion"
                className="text-sm font-medium text-foreground"
              >
                Descripción breve{" "}
                <span className="text-xs font-normal text-muted-icon">
                  (opcional)
                </span>
              </label>
              <textarea
                id="sol-descripcion"
                rows={3}
                value={descripcion}
                onChange={(e) => {
                  setDescripcion(e.target.value);
                  campos.limpiar("descripcion");
                }}
                placeholder="Contanos brevemente a qué se dedica tu empresa…"
                maxLength={LARGO_MAXIMO.descripcion}
                className={`w-full resize-none rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-placeholder outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 disabled:opacity-60 ${CLASE_CONTROL_INVALIDO}`}
                disabled={isPending}
                {...ariaErrorCampo("sol-descripcion", campos.errores.descripcion)}
              />
              <ErrorCampo idCampo="sol-descripcion" mensaje={campos.errores.descripcion} />
              <ContadorCaracteres actual={descripcion.length} maximo={LARGO_MAXIMO.descripcion} />
            </div>
          </div>
        </section>

        <div className="h-px bg-border" />

        {/* ── 2. Persona responsable ────────────────────────────────── */}
        <section>
          <SectionTitle>Persona responsable</SectionTitle>
          <div className="grid grid-cols-1 gap-4 @2xl:grid-cols-2 @5xl:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="sol-nombre"
                  className="text-sm font-medium text-foreground"
                >
                  Nombre <Obligatorio />
                </label>
                <InputWrapper>
                  <FieldIcon icon={User} />
                  <input
                    id="sol-nombre"
                    type="text"
                    autoComplete="given-name"
                    required
                    value={nombre}
                    onChange={(e) => {
                      setNombre(e.target.value);
                      campos.limpiar("nombre");
                    }}
                    placeholder="Ej: Carlos"
                    className={inputClass}
                    disabled={isPending}
                    {...ariaErrorCampo("sol-nombre", campos.errores.nombre)}
                  />
                </InputWrapper>
                <ErrorCampo idCampo="sol-nombre" mensaje={campos.errores.nombre} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="sol-apellido"
                  className="text-sm font-medium text-foreground"
                >
                  Apellido <Obligatorio />
                </label>
                <InputWrapper>
                  <FieldIcon icon={User} />
                  <input
                    id="sol-apellido"
                    type="text"
                    autoComplete="family-name"
                    required
                    value={apellido}
                    onChange={(e) => {
                      setApellido(e.target.value);
                      campos.limpiar("apellido");
                    }}
                    placeholder="Ej: Ramírez"
                    className={inputClass}
                    disabled={isPending}
                    {...ariaErrorCampo("sol-apellido", campos.errores.apellido)}
                  />
                </InputWrapper>
                <ErrorCampo idCampo="sol-apellido" mensaje={campos.errores.apellido} />
              </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="sol-telefono"
                className="text-sm font-medium text-foreground"
              >
                Teléfono / Celular <Obligatorio />
              </label>
              <InputWrapper>
                <FieldIcon icon={Phone} />
                <input
                  id="sol-telefono"
                  type="tel"
                  autoComplete="tel"
                  required
                  value={telefono}
                  onChange={(e) => {
                    setTelefono(e.target.value);
                    campos.limpiar("telefono");
                  }}
                  placeholder="Ej: 341 5678901"
                  {...ariaErrorCampo("sol-telefono", campos.errores.telefono)}
                  className={inputClass}
                  disabled={isPending}
                />
              </InputWrapper>
              <ErrorCampo idCampo="sol-telefono" mensaje={campos.errores.telefono} />
            </div>
          </div>
        </section>

        {/* ── Error global ─────────────────────────────────────────────── */}
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

        {/* ── Submit ──────────────────────────────────────────────────── */}
        <button
          type="submit"
          disabled={isPending || cuitError}
          className="flex h-11 items-center justify-center gap-2 self-end rounded-lg bg-primary px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Enviando…
            </>
          ) : (
            "Reenviar solicitud"
          )}
        </button>
      </form>
    </div>
  );
}
