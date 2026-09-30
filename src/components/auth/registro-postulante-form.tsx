"use client";

import { useState, useRef } from "react";
import { createPortal } from "react-dom";
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
  FileText,
  Upload,
  X,
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
    <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9ca3a0]" />
  );
}

const inputClass =
  "w-full rounded-lg border border-[#d8ddd7] bg-[#f8f8f4] py-2.5 pl-10 pr-4 text-sm text-[#1b2926] placeholder:text-[#b0b8b4] outline-none transition focus:border-[#0f5b53] focus:bg-white focus:ring-2 focus:ring-[#0f5b53]/20 disabled:cursor-not-allowed disabled:opacity-60";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-[#0f5b53]">
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
  const [calle, setCalle] = useState("");
  const [telefono, setTelefono] = useState("");

  // Access
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordRepeat, setPasswordRepeat] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordRepeat, setShowPasswordRepeat] = useState(false);

  // CV
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvDragOver, setCvDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Residency confirmation
  const [confirmaFunes, setConfirmaFunes] = useState(false);

  // Submit state
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successModalOpen, setSuccessModalOpen] = useState(false);

  // ── derived ────────────────────────────────────────────────────────────────
  const passwordsMatch =
    passwordRepeat === "" || password === passwordRepeat;
  const passwordRepeatError =
    passwordRepeat !== "" && password !== passwordRepeat;

  // ── handlers ───────────────────────────────────────────────────────────────
  const handleCvFile = (file: File) => {
    if (file.type !== "application/pdf") {
      setSubmitError("El CV debe ser un archivo PDF.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setSubmitError("El CV no puede superar los 5 MB.");
      return;
    }
    setSubmitError(null);
    setCvFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setCvDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleCvFile(file);
  };

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

    setSubmitError(null);
    setIsLoading(true);
    // TODO: integrar con Supabase Auth + Storage para el CV
    await new Promise((r) => setTimeout(r, 1200));
    setIsLoading(false);
    setSuccessModalOpen(true);
  };

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-xl">
      {/* Header */}
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#0f5b53]/10 text-[#0f5b53]">
          <UserPlus className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-[#1b2926]">
          Registro de Postulante
        </h1>
        <p className="mt-1 text-sm text-[#6e7772]">
          Portal de Empleo · Municipalidad de Funes
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="flex flex-col gap-6 rounded-2xl border border-[#d8ddd7] bg-white px-7 py-8 shadow-sm"
      >
        {/* ── 1. Datos personales ────────────────────────────────────────── */}
        <section>
          <SectionTitle>Datos personales</SectionTitle>
          <div className="flex flex-col gap-4">
            {/* Nombre + Apellido */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="reg-nombre" className="text-sm font-medium text-[#1b2926]">
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
                <label htmlFor="reg-apellido" className="text-sm font-medium text-[#1b2926]">
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
              <label htmlFor="reg-dni" className="text-sm font-medium text-[#1b2926]">
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
              <label htmlFor="reg-calle" className="text-sm font-medium text-[#1b2926]">
                Dirección <span className="text-red-500">*</span>
              </label>
              <InputWrapper>
                <FieldIcon icon={MapPin} />
                <input
                  id="reg-calle"
                  type="text"
                  autoComplete="street-address"
                  required
                  value={calle}
                  onChange={(e) => setCalle(e.target.value)}
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
                    <span className="text-xs text-[#9ca3a0]">{label}</span>
                    <div className="flex items-center gap-1.5 rounded-lg border border-[#d8ddd7] bg-[#f0f4f1] px-3 py-2.5 text-sm font-medium text-[#4f5a54]">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#0f5b53]" />
                      {value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Teléfono */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="reg-telefono" className="text-sm font-medium text-[#1b2926]">
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

        <div className="h-px bg-[#d8ddd7]" />

        {/* ── 2. Acceso ──────────────────────────────────────────────────── */}
        <section>
          <SectionTitle>Datos de acceso</SectionTitle>
          <div className="flex flex-col gap-4">
            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="reg-email" className="text-sm font-medium text-[#1b2926]">
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
              <label htmlFor="reg-password" className="text-sm font-medium text-[#1b2926]">
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9ca3a0] transition hover:text-[#4f5a54]"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </InputWrapper>
            </div>

            {/* Repetir contraseña */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="reg-password-repeat" className="text-sm font-medium text-[#1b2926]">
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9ca3a0] transition hover:text-[#4f5a54]"
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
                <p className="flex items-center gap-1.5 text-xs text-[#0f5b53]">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  Las contraseñas coinciden.
                </p>
              )}
            </div>
          </div>
        </section>

        <div className="h-px bg-[#d8ddd7]" />

        {/* ── 3. CV ──────────────────────────────────────────────────────── */}
        <section>
          <SectionTitle>Curriculum Vitae</SectionTitle>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleCvFile(file);
            }}
          />
          {!cvFile ? (
            <div
              role="button"
              tabIndex={0}
              aria-label="Subir CV en PDF"
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setCvDragOver(true);
              }}
              onDragLeave={() => setCvDragOver(false)}
              onDrop={handleDrop}
              className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-8 text-center transition ${
                cvDragOver
                  ? "border-[#0f5b53] bg-[#f0f9f7]"
                  : "border-[#d8ddd7] bg-[#f8f8f4] hover:border-[#0f5b53]/50 hover:bg-[#f3f7f4]"
              }`}
            >
              <Upload className="h-8 w-8 text-[#9ca3a0]" />
              <div>
                <p className="text-sm font-medium text-[#1b2926]">
                  Arrastrá tu CV acá o{" "}
                  <span className="text-[#0f5b53] underline underline-offset-2">
                    hacé clic para seleccionarlo
                  </span>
                </p>
                <p className="mt-1 text-xs text-[#9ca3a0]">
                  Solo PDF · Máximo 5 MB
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-[#d8ddd7] bg-[#f3f7f4] px-4 py-3">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 shrink-0 text-[#0f5b53]" />
                <div>
                  <p className="text-sm font-medium text-[#1b2926] break-all">
                    {cvFile.name}
                  </p>
                  <p className="text-xs text-[#6e7772]">
                    {(cvFile.size / 1024).toFixed(0)} KB · PDF
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCvFile(null)}
                className="shrink-0 rounded-full p-1 text-[#6e7772] transition hover:bg-red-50 hover:text-red-500"
                aria-label="Quitar archivo"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </section>

        <div className="h-px bg-[#d8ddd7]" />

        {/* ── 4. Confirmación de residencia ──────────────────────────────── */}
        <section>
          <label className="flex cursor-pointer items-start gap-3">
            <input
              id="reg-confirma-funes"
              type="checkbox"
              required
              checked={confirmaFunes}
              onChange={(e) => setConfirmaFunes(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[#0f5b53] cursor-pointer"
            />
            <span className="text-sm text-[#4f5a54]">
              <span className="font-semibold text-[#1b2926]">
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
          className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#0f5b53] text-sm font-semibold text-white shadow-sm transition hover:bg-[#093e39] focus:outline-none focus:ring-2 focus:ring-[#0f5b53]/40 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <UserPlus className="h-4 w-4" />
          )}
          {isLoading ? "Registrando…" : "Crear cuenta"}
        </button>

        {/* ── Footer del form ────────────────────────────────────────────── */}
        <p className="text-center text-xs text-[#9ca3a0]">
          ¿Ya tenés una cuenta?{" "}
          <Link href="/auth/login" className="font-semibold text-[#0f5b53] hover:underline">
            Iniciá sesión acá
          </Link>
        </p>
      </form>

      {/* Back to home */}
      <p className="mt-5 mb-8 text-center text-xs text-[#9ca3a0]">
        <Link href="/" className="hover:text-[#0f5b53] hover:underline">
          ← Volver al inicio
        </Link>
      </p>

      {/* ── Success Modal ─────────────────────────────────────────────────── */}
      {successModalOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
            role="dialog"
            aria-modal="true"
            aria-labelledby="success-dialog-title"
          >
            <div className="relative w-full max-w-sm rounded-2xl border border-[#d8ddd7] bg-white p-8 text-center shadow-xl">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#0f5b53]/10 text-[#0f5b53]">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <h3
                id="success-dialog-title"
                className="text-xl font-bold text-[#1b2926]"
              >
                ¡Registro exitoso!
              </h3>
              <p className="mt-2 text-sm text-[#6e7772]">
                Tu cuenta fue creada correctamente. Revisá tu correo electrónico para confirmar tu dirección y activar tu cuenta.
              </p>
              <Link
                href="/auth/login"
                className="mt-6 flex h-10 w-full items-center justify-center rounded-lg bg-[#0f5b53] text-sm font-semibold text-white transition hover:bg-[#093e39]"
              >
                Ir a iniciar sesión
              </Link>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
