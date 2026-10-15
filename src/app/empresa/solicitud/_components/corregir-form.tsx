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
import { reenviarSolicitudEmpresa } from "@/app/empresa/actions";
import { toErrorAccion, type ErrorAccion } from "@/lib/resultado";
import { useAccion } from "@/lib/use-accion";
import type { Tabla } from "@/types/db";

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
  "w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-placeholder outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60";

const selectClass =
  "w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-8 text-sm text-foreground outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60 appearance-none cursor-pointer";

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
  const [telefonoError, setTelefonoError] = useState<string | null>(null);

  const [submitError, setSubmitError] = useState<ErrorAccion | null>(null);
  const { pendiente: isPending, ejecutar } = useAccion();

  const cuitCompleto = cuit.length === 11;
  const cuitError = cuitCompleto && validarCuitConMensaje(cuit) !== null;
  const cuitValido = cuitCompleto && validarCuitConMensaje(cuit) === null;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitError(null);

    const errTelefono = telefono.trim()
      ? validarTelefono(telefono)
      : "Ingresá un teléfono de contacto.";
    setTelefonoError(errTelefono);
    if (errTelefono) {
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
        setSubmitError(toErrorAccion(result));
      } else {
        router.push("/empresa?aviso=reenviada");
      }
    });
  }

  return (
    <div className="w-full max-w-xl">
      {/* Motivo del rechazo */}
      {datos.motivoRechazo && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4">
          <p className="text-sm font-semibold text-red-700">
            Motivo del rechazo:
          </p>
          <p className="mt-1 text-sm text-red-700">{datos.motivoRechazo}</p>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        noValidate
        className="flex flex-col gap-6 rounded-2xl border border-border bg-white px-7 py-8 shadow-sm"
      >
        {/* ── 1. Datos de la empresa ────────────────────────────────── */}
        <section>
          <SectionTitle>Datos de la empresa</SectionTitle>
          <div className="flex flex-col gap-4">
            {/* Razón social */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="sol-razon-social"
                className="text-sm font-medium text-foreground"
              >
                Razón social <span className="text-red-500">*</span>
              </label>
              <InputWrapper>
                <FieldIcon icon={Building2} />
                <input
                  id="sol-razon-social"
                  type="text"
                  autoComplete="organization"
                  required
                  value={razonSocial}
                  onChange={(e) => setRazonSocial(e.target.value)}
                  placeholder="Ej: Construcciones del Sur S.R.L."
                  className={inputClass}
                  disabled={isPending}
                />
              </InputWrapper>
            </div>

            {/* CUIT */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="sol-cuit"
                className="text-sm font-medium text-foreground"
              >
                CUIT <span className="text-red-500">*</span>
              </label>
              <InputWrapper>
                <FieldIcon icon={Hash} />
                <input
                  id="sol-cuit"
                  type="text"
                  inputMode="numeric"
                  required
                  value={formatearCUIT(cuit)}
                  onChange={(e) =>
                    setCuit(e.target.value.replace(/\D/g, "").slice(0, 11))
                  }
                  placeholder="30-12345678-9"
                  className={`${inputClass} ${
                    cuitError
                      ? "border-red-400 focus:border-red-400 focus:ring-red-400/20"
                      : ""
                  }`}
                  disabled={isPending}
                />
              </InputWrapper>
              {cuitError && (
                <p className="flex items-center gap-1.5 text-xs text-red-500">
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
                Rubro <span className="text-red-500">*</span>
              </label>
              <InputWrapper>
                <FieldIcon icon={Briefcase} />
                <select
                  id="sol-rubro"
                  required
                  value={rubro}
                  onChange={(e) => setRubro(e.target.value)}
                  className={selectClass}
                  disabled={isPending}
                >
                  <option value="" disabled>
                    Seleccioná un rubro…
                  </option>
                  {datos.rubros.map((c) => (
                    <option key={c.id} value={c.nombre}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </InputWrapper>
            </div>

            {/* Descripción */}
            <div className="flex flex-col gap-1.5">
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
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Contanos brevemente a qué se dedica tu empresa…"
                maxLength={LARGO_MAXIMO.descripcion}
                className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-placeholder outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                disabled={isPending}
              />
              <ContadorCaracteres actual={descripcion.length} maximo={LARGO_MAXIMO.descripcion} />
            </div>
          </div>
        </section>

        <div className="h-px bg-border" />

        {/* ── 2. Persona responsable ────────────────────────────────── */}
        <section>
          <SectionTitle>Persona responsable</SectionTitle>
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="sol-nombre"
                  className="text-sm font-medium text-foreground"
                >
                  Nombre <span className="text-red-500">*</span>
                </label>
                <InputWrapper>
                  <FieldIcon icon={User} />
                  <input
                    id="sol-nombre"
                    type="text"
                    autoComplete="given-name"
                    required
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej: Carlos"
                    className={inputClass}
                    disabled={isPending}
                  />
                </InputWrapper>
              </div>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="sol-apellido"
                  className="text-sm font-medium text-foreground"
                >
                  Apellido <span className="text-red-500">*</span>
                </label>
                <InputWrapper>
                  <FieldIcon icon={User} />
                  <input
                    id="sol-apellido"
                    type="text"
                    autoComplete="family-name"
                    required
                    value={apellido}
                    onChange={(e) => setApellido(e.target.value)}
                    placeholder="Ej: Ramírez"
                    className={inputClass}
                    disabled={isPending}
                  />
                </InputWrapper>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="sol-telefono"
                className="text-sm font-medium text-foreground"
              >
                Teléfono / Celular <span className="text-red-500">*</span>
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
                    if (telefonoError) setTelefonoError(null);
                  }}
                  placeholder="Ej: 341 5678901"
                  aria-invalid={telefonoError ? true : undefined}
                  aria-describedby={telefonoError ? "sol-telefono-error" : undefined}
                  className={`${inputClass} ${
                    telefonoError
                      ? "border-red-400 focus:border-red-400 focus:ring-red-400/20"
                      : ""
                  }`}
                  disabled={isPending}
                />
              </InputWrapper>
              {telefonoError && (
                <p
                  id="sol-telefono-error"
                  className="flex items-center gap-1.5 text-xs text-red-500"
                >
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {telefonoError}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* ── Error global ─────────────────────────────────────────────── */}
        {submitError && (
          <div className="flex flex-col gap-1 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{submitError.mensaje}</span>
            </div>
            {submitError.ref && (
              <p className="ml-7 text-xs text-gray-500">
                Si el problema sigue, comunicate con la Oficina de Empleo e indicá este código: {submitError.ref}
              </p>
            )}
          </div>
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
