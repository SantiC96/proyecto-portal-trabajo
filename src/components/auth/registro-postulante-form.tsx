"use client";

import { useState } from "react";
import { registrarPostulante } from "@/app/auth/actions";
import Link from "next/link";
import {
  User,
  CreditCard,
  MapPin,
  Phone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  UserPlus,
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

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-primary">
      {children}
    </h2>
  );
}

// ─── component ──────────────────────────────────────────────────────────────

export function RegistroPostulanteForm() {
  // Personal data
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [dni, setDni] = useState("");
  const [domicilio, setDomicilio] = useState("");
  const [telefono, setTelefono] = useState("");

  // Access
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordRepeat, setPasswordRepeat] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordRepeat, setShowPasswordRepeat] = useState(false);

  // Residency confirmation
  const [confirmaFunes, setConfirmaFunes] = useState(false);

  // Submit state
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // ── derived ────────────────────────────────────────────────────────────────
  const passwordRepeatError =
    passwordRepeat !== "" && password !== passwordRepeat;

  // ── handlers ───────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (password !== passwordRepeat) {
      setSubmitError("Las contraseñas no coinciden.");
      return;
    }
    if (!confirmaFunes) {
      setSubmitError(
        "Debés confirmar que sos residente de la ciudad de Funes."
      );
      return;
    }
    if (dni.length < 7 || dni.length > 8) {
      setSubmitError("El DNI debe tener 7 u 8 números.");
      return;
    }

    setSubmitError(null);
    setIsLoading(true);
    const result = await registrarPostulante({
      nombre,
      apellido,
      telefono,
      dni,
      domicilio,
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
          <UserPlus className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
          Registro de Postulante
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
        {/* ── 1. Datos personales ────────────────────────────────────────── */}
        <section>
          <SectionTitle>Datos personales</SectionTitle>
          <div className="flex flex-col gap-4">
            {/* Nombre + Apellido */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="reg-nombre" className="text-sm font-medium text-foreground">
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
                    placeholder="Ej: María"
                    className={inputClass}
                  />
                </InputWrapper>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="reg-apellido" className="text-sm font-medium text-foreground">
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
                    placeholder="Ej: González"
                    className={inputClass}
                  />
                </InputWrapper>
              </div>
            </div>

            {/* DNI */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="reg-dni" className="text-sm font-medium text-foreground">
                DNI <span className="text-red-500">*</span>
              </label>
              <InputWrapper>
                <FieldIcon icon={CreditCard} />
                <input
                  id="reg-dni"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{7,8}"
                  required
                  value={dni}
                  onChange={(e) =>
                    setDni(e.target.value.replace(/\D/g, "").slice(0, 8))
                  }
                  placeholder="12345678"
                  className={inputClass}
                />
              </InputWrapper>
            </div>

            {/* Dirección */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="reg-domicilio" className="text-sm font-medium text-foreground">
                Dirección <span className="text-red-500">*</span>
              </label>
              <InputWrapper>
                <FieldIcon icon={MapPin} />
                <input
                  id="reg-domicilio"
                  type="text"
                  autoComplete="street-address"
                  required
                  value={domicilio}
                  onChange={(e) => setDomicilio(e.target.value)}
                  placeholder="Calle y número  (Ej: San Martín 432)"
                  className={inputClass}
                />
              </InputWrapper>
              {/* Ciudad/Prov/País fijo */}
              <div className="mt-1.5 grid grid-cols-3 gap-2">
                {[
                  { label: "Ciudad", value: "Funes" },
                  { label: "Provincia", value: "Santa Fe" },
                  { label: "País", value: "Argentina" },
                ].map(({ label, value }) => (
                  <div key={label} className="flex flex-col gap-1">
                    <span className="text-xs text-muted-icon">{label}</span>
                    <div className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-tinted px-3 py-2.5 text-sm font-medium text-muted-foreground-strong">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" />
                      {value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Teléfono */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="reg-telefono" className="text-sm font-medium text-foreground">
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
          </div>
        </section>

        <div className="h-px bg-border" />

        {/* ── 2. Acceso ──────────────────────────────────────────────────── */}
        <section>
          <SectionTitle>Datos de acceso</SectionTitle>
          <div className="flex flex-col gap-4">
            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="reg-email" className="text-sm font-medium text-foreground">
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
                  placeholder="tucorreo@ejemplo.com"
                  className={inputClass}
                />
              </InputWrapper>
            </div>

            {/* Contraseña */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="reg-password" className="text-sm font-medium text-foreground">
                Contraseña <span className="text-red-500">*</span>
              </label>
              <InputWrapper>
                <FieldIcon icon={Lock} />
                <input
                  id="reg-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className={`${inputClass} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-icon transition hover:text-muted-foreground-strong"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </InputWrapper>
            </div>

            {/* Repetir contraseña */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="reg-password-repeat" className="text-sm font-medium text-foreground">
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
                  aria-label={showPasswordRepeat ? "Ocultar contraseña" : "Mostrar contraseña"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-icon transition hover:text-muted-foreground-strong"
                >
                  {showPasswordRepeat ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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

        <div className="h-px bg-border" />

        {/* ── 3. Confirmación de residencia ──────────────────────────────── */}
        <section>
          <label className="flex cursor-pointer items-start gap-3">
            <input
              id="reg-confirma-funes"
              type="checkbox"
              required
              checked={confirmaFunes}
              onChange={(e) => setConfirmaFunes(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-primary cursor-pointer"
            />
            <span className="text-sm text-muted-foreground-strong">
              <span className="font-semibold text-foreground">
                Confirmo que soy residente de la ciudad de Funes, Santa Fe, Argentina.
              </span>{" "}
              Este portal es exclusivo para habitantes de Funes.
            </span>
          </label>
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
          id="reg-postulante-submit"
          disabled={isLoading || passwordRepeatError}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <UserPlus className="h-4 w-4" />
          )}
          {isLoading ? "Registrando…" : "Crear cuenta"}
        </button>

        {/* ── Footer del form ────────────────────────────────────────────── */}
        <p className="text-center text-xs text-muted-icon">
          ¿Ya tenés una cuenta?{" "}
          <Link href="/auth/login" className="font-semibold text-primary hover:underline">
            Iniciá sesión acá
          </Link>
        </p>
      </form>

      {/* Back to home */}
      <p className="mt-5 mb-8 text-center text-xs text-muted-icon">
        <Link href="/" className="hover:text-primary hover:underline">
          ← Volver al inicio
        </Link>
      </p>

    </div>
  );
}
