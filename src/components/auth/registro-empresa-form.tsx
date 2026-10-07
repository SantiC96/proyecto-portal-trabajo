"use client";

import { useState } from "react";
import { registrarEmpresa } from "@/app/auth/actions";
import { formatearCUIT } from "@/lib/cuit";
import { validarCuitConMensaje } from "@/lib/validaciones";
import Link from "next/link";
import {
  Building2,
  Hash,
  Briefcase,
  User,
  Phone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

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

// ─── component ──────────────────────────────────────────────────────────────

interface Props {
  categorias: { id: string; nombre: string }[];
}

export function RegistroEmpresaForm({ categorias }: Props) {
  // Empresa data
  const [razonSocial, setRazonSocial] = useState("");
  const [cuit, setCuit] = useState(""); // raw 11 digits
  const [rubro, setRubro] = useState("");
  const [descripcion, setDescripcion] = useState("");

  // Responsible person
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordRepeat, setPasswordRepeat] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordRepeat, setShowPasswordRepeat] = useState(false);

  // Submit state
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // ── derived ────────────────────────────────────────────────────────────────
  const passwordRepeatError =
    passwordRepeat !== "" && password !== passwordRepeat;
  const cuitCompleto = cuit.length === 11;
  const cuitError = cuitCompleto && validarCuitConMensaje(cuit) !== null;
  const cuitValido = cuitCompleto && validarCuitConMensaje(cuit) === null;

  // ── handlers ───────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (password !== passwordRepeat) {
      setSubmitError("Las contraseñas no coinciden.");
      return;
    }
    const cuitErrMsg = validarCuitConMensaje(cuit);
    if (cuitErrMsg) {
      setSubmitError(cuitErrMsg);
      return;
    }

    setSubmitError(null);
    setIsLoading(true);
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
    if (result?.error) {
      setSubmitError(result.error);
      setIsLoading(false);
    }
  };

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-xl">
      {/* Header */}
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Building2 className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
          Registro de Empresa
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Portal de Empleo · Municipalidad de Funes
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="flex flex-col gap-6 rounded-2xl border border-border bg-white px-7 py-8 shadow-sm"
      >
        {/* ── 1. Datos de la empresa ────────────────────────────────────── */}
        <section>
          <SectionTitle>Datos de la empresa</SectionTitle>
          <div className="flex flex-col gap-4">
            {/* Razón social */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="reg-razon-social"
                className="text-sm font-medium text-foreground"
              >
                Razón social <span className="text-red-500">*</span>
              </label>
              <InputWrapper>
                <FieldIcon icon={Building2} />
                <input
                  id="reg-razon-social"
                  type="text"
                  autoComplete="organization"
                  required
                  value={razonSocial}
                  onChange={(e) => setRazonSocial(e.target.value)}
                  placeholder="Ej: Construcciones del Sur S.R.L."
                  className={inputClass}
                />
              </InputWrapper>
            </div>

            {/* CUIT */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="reg-cuit"
                className="text-sm font-medium text-foreground"
              >
                CUIT <span className="text-red-500">*</span>
              </label>
              <InputWrapper>
                <FieldIcon icon={Hash} />
                <input
                  id="reg-cuit"
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
                htmlFor="reg-rubro"
                className="text-sm font-medium text-foreground"
              >
                Rubro <span className="text-red-500">*</span>
              </label>
              <InputWrapper>
                <FieldIcon icon={Briefcase} />
                <select
                  id="reg-rubro"
                  required
                  value={rubro}
                  onChange={(e) => setRubro(e.target.value)}
                  className={selectClass}
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
              </InputWrapper>
            </div>

            {/* Descripción */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="reg-descripcion"
                className="text-sm font-medium text-foreground"
              >
                Descripción breve{" "}
                <span className="text-xs font-normal text-muted-icon">
                  (opcional)
                </span>
              </label>
              <textarea
                id="reg-descripcion"
                rows={3}
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Contanos brevemente a qué se dedica tu empresa…"
                className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-placeholder outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
        </section>

        <div className="h-px bg-border" />

        {/* ── 2. Persona responsable ────────────────────────────────────── */}
        <section>
          <SectionTitle>Persona responsable</SectionTitle>
          <div className="flex flex-col gap-4">
            {/* Nombre + Apellido */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="reg-nombre"
                  className="text-sm font-medium text-foreground"
                >
                  Nombre <span className="text-red-500">*</span>
                </label>
                <InputWrapper>
                  <FieldIcon icon={User} />
                  <input
                    id="reg-nombre"
                    type="text"
                    autoComplete="given-name"
                    required
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej: Carlos"
                    className={inputClass}
                  />
                </InputWrapper>
              </div>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="reg-apellido"
                  className="text-sm font-medium text-foreground"
                >
                  Apellido <span className="text-red-500">*</span>
                </label>
                <InputWrapper>
                  <FieldIcon icon={User} />
                  <input
                    id="reg-apellido"
                    type="text"
                    autoComplete="family-name"
                    required
                    value={apellido}
                    onChange={(e) => setApellido(e.target.value)}
                    placeholder="Ej: Ramírez"
                    className={inputClass}
                  />
                </InputWrapper>
              </div>
            </div>

            {/* Teléfono */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="reg-telefono"
                className="text-sm font-medium text-foreground"
              >
                Teléfono / Celular <span className="text-red-500">*</span>
              </label>
              <InputWrapper>
                <FieldIcon icon={Phone} />
                <input
                  id="reg-telefono"
                  type="tel"
                  autoComplete="tel"
                  required
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="Ej: 341 5678901"
                  className={inputClass}
                />
              </InputWrapper>
            </div>

            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="reg-email"
                className="text-sm font-medium text-foreground"
              >
                Correo electrónico <span className="text-red-500">*</span>
              </label>
              <InputWrapper>
                <FieldIcon icon={Mail} />
                <input
                  id="reg-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="empresa@ejemplo.com"
                  className={inputClass}
                />
              </InputWrapper>
            </div>

            {/* Contraseña */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="reg-password"
                className="text-sm font-medium text-foreground"
              >
                Contraseña <span className="text-red-500">*</span>
              </label>
              <InputWrapper>
                <FieldIcon icon={Lock} />
                <input
                  id="reg-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className={`${inputClass} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={
                    showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-icon transition hover:text-muted-foreground-strong"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </InputWrapper>
            </div>

            {/* Repetir contraseña */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="reg-password-repeat"
                className="text-sm font-medium text-foreground"
              >
                Repetir contraseña <span className="text-red-500">*</span>
              </label>
              <InputWrapper>
                <FieldIcon icon={Lock} />
                <input
                  id="reg-password-repeat"
                  type={showPasswordRepeat ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={passwordRepeat}
                  onChange={(e) => setPasswordRepeat(e.target.value)}
                  placeholder="Repetí tu contraseña"
                  className={`${inputClass} pr-10 ${
                    passwordRepeatError
                      ? "border-red-400 focus:border-red-400 focus:ring-red-400/20"
                      : ""
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordRepeat(!showPasswordRepeat)}
                  aria-label={
                    showPasswordRepeat
                      ? "Ocultar contraseña"
                      : "Mostrar contraseña"
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-icon transition hover:text-muted-foreground-strong"
                >
                  {showPasswordRepeat ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </InputWrapper>
              {passwordRepeatError && (
                <p className="flex items-center gap-1.5 text-xs text-red-500">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  Las contraseñas no coinciden.
                </p>
              )}
              {!passwordRepeatError && passwordRepeat !== "" && (
                <p className="flex items-center gap-1.5 text-xs text-primary">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  Las contraseñas coinciden.
                </p>
              )}
            </div>
          </div>
        </section>

        {/* ── Error global ───────────────────────────────────────────────── */}
        {submitError && (
          <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        {/* ── Submit ─────────────────────────────────────────────────────── */}
        <button
          type="submit"
          id="reg-empresa-submit"
          disabled={isLoading || passwordRepeatError || cuitError}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <Building2 className="h-4 w-4" />
          )}
          {isLoading ? "Registrando…" : "Registrar empresa"}
        </button>

        {/* ── Footer del form ────────────────────────────────────────────── */}
        <p className="text-center text-xs text-muted-icon">
          ¿Ya tenés una cuenta?{" "}
          <Link
            href="/auth/login"
            className="font-semibold text-primary hover:underline"
          >
            Iniciá sesión acá
          </Link>
        </p>
      </form>

      {/* Back to home */}
      <p className="mb-8 mt-5 text-center text-xs text-muted-icon">
        <Link href="/" className="hover:text-primary hover:underline">
          ← Volver al inicio
        </Link>
      </p>
    </div>
  );
}
