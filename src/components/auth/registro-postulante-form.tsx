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
  FileText,
  X,
} from "lucide-react";
import {
  CLASE_CONTROL_INVALIDO,
  ErrorCampo,
  Obligatorio,
  ariaErrorCampo,
  idErrorCampo,
} from "@/components/ui/obligatorio";
import { useErroresCampo } from "@/lib/use-errores-campo";
import { useAccion } from "@/lib/use-accion";
import { Spinner } from "@/components/ui/spinner";
import { BotonVolver } from "@/components/ui/boton-volver";
import { Aviso } from "@/components/ui/aviso";

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

  // Procedencia (migration_055)
  const [localidad, setLocalidad] = useState("");
  const [otraLocalidad, setOtraLocalidad] = useState("");
  const [comprobante, setComprobante] = useState<File | null>(null);

  // Submit state
  const { pendiente: isLoading, ejecutar } = useAccion();
  const [submitError, setSubmitError] = useState<ErrorAccion | null>(null);
  const campos = useErroresCampo<Campo>();

  // ── derived ────────────────────────────────────────────────────────────────
  const passwordRepeatError =
    passwordRepeat !== "" && password !== passwordRepeat;
  const esDeFunes =
    localidad === LOCALIDAD_FUNES ||
    (localidad === OTRA_LOCALIDAD && esLocalidadFunes(otraLocalidad));

  // ── handlers procedencia ───────────────────────────────────────────────────
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

  // ── handlers ───────────────────────────────────────────────────────────────
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

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-xl">
      <BotonVolver href="/" className="mb-3">
        Volver al inicio
      </BotonVolver>
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
        className="tarjeta flex flex-col gap-6 px-4 py-6 sm:px-7 sm:py-8"
      >
        {/* ── 1. Datos personales ────────────────────────────────────────── */}
        <section>
          <SectionTitle>Datos personales</SectionTitle>
          <div className="flex flex-col gap-4">
            {/* Nombre + Apellido */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="reg-nombre" className="text-sm font-medium text-foreground">
                  Nombre <Obligatorio />
                </label>
                <InputWrapper>
                  <FieldIcon icon={User} />
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
                    className={inputClass}
                    {...ariaErrorCampo("reg-nombre", campos.errores.nombre)}
                  />
                </InputWrapper>
                <ErrorCampo idCampo="reg-nombre" mensaje={campos.errores.nombre} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="reg-apellido" className="text-sm font-medium text-foreground">
                  Apellido <Obligatorio />
                </label>
                <InputWrapper>
                  <FieldIcon icon={User} />
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
                    className={inputClass}
                    {...ariaErrorCampo("reg-apellido", campos.errores.apellido)}
                  />
                </InputWrapper>
                <ErrorCampo idCampo="reg-apellido" mensaje={campos.errores.apellido} />
              </div>
            </div>

            {/* DNI */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="reg-dni" className="text-sm font-medium text-foreground">
                DNI <Obligatorio />
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
                  onChange={(e) => {
                    setDni(e.target.value.replace(/\D/g, "").slice(0, 8));
                    campos.limpiar("dni");
                  }}
                  placeholder="12345678"
                  className={inputClass}
                  {...ariaErrorCampo("reg-dni", campos.errores.dni)}
                />
              </InputWrapper>
              <ErrorCampo idCampo="reg-dni" mensaje={campos.errores.dni} />
            </div>

            {/* Dirección */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="reg-domicilio" className="text-sm font-medium text-foreground">
                Dirección <Obligatorio />
              </label>
              <InputWrapper>
                <FieldIcon icon={MapPin} />
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
                  placeholder="Calle y número  (Ej: San Martín 432)"
                  maxLength={LARGO_MAXIMO.domicilio}
                  className={inputClass}
                  {...ariaErrorCampo("reg-domicilio", campos.errores.domicilio)}
                />
              </InputWrapper>
              <ErrorCampo idCampo="reg-domicilio" mensaje={campos.errores.domicilio} />
            </div>

            {/* Procedencia */}
            <CampoLocalidad
              id="reg-localidad"
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
              <div className="flex flex-col gap-1.5">
                <label htmlFor="reg-comprobante" className="text-sm font-medium text-foreground">
                  Comprobante de domicilio (opcional)
                </label>
                <p id="reg-comprobante-ayuda" className="text-xs text-muted-foreground">
                  Cualquier documento donde figure tu dirección en Funes (por ejemplo, una
                  factura de un servicio). Lo revisa la Oficina de Empleo.
                </p>
                {comprobante ? (
                  <div className="flex items-center gap-3 rounded-lg border border-border bg-surface-tinted px-3 py-2">
                    <FileText className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="break-all text-sm font-medium text-foreground">
                        {comprobante.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {textoTamanoArchivo(comprobante.size)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setComprobante(null)}
                      disabled={isLoading}
                      className="btn-secundario inline-flex min-h-11 shrink-0 items-center gap-1.5 px-3 text-sm font-medium"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                      Quitar
                    </button>
                  </div>
                ) : (
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
                    className={
                      "block min-h-11 w-full cursor-pointer rounded-lg border border-border bg-background text-sm text-muted-foreground file:mr-3 file:min-h-11 file:cursor-pointer file:border-0 file:bg-secondary file:px-4 file:text-sm file:font-medium file:text-primary hover:file:bg-secondary-hover " +
                      CLASE_CONTROL_INVALIDO
                    }
                  />
                )}
                <p className="text-xs text-muted-icon">{COMPROBANTE_HELP_TEXT}</p>
                <ErrorCampo idCampo="reg-comprobante" mensaje={campos.errores.comprobante} />
              </div>
            )}

            {/* Teléfono */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="reg-telefono" className="text-sm font-medium text-foreground">
                Teléfono / Celular <Obligatorio />
              </label>
              <InputWrapper>
                <FieldIcon icon={Phone} />
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
                  className={inputClass}
                  {...ariaErrorCampo("reg-telefono", campos.errores.telefono)}
                />
              </InputWrapper>
              <ErrorCampo idCampo="reg-telefono" mensaje={campos.errores.telefono} />
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
                Correo electrónico <Obligatorio />
              </label>
              <InputWrapper>
                <FieldIcon icon={Mail} />
                <input
                  id="reg-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    campos.limpiar("email");
                  }}
                  placeholder="tucorreo@ejemplo.com"
                  className={inputClass}
                  {...ariaErrorCampo("reg-email", campos.errores.email)}
                />
              </InputWrapper>
              <ErrorCampo idCampo="reg-email" mensaje={campos.errores.email} />
            </div>

            {/* Contraseña */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="reg-password" className="text-sm font-medium text-foreground">
                Contraseña <Obligatorio />
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
                  onChange={(e) => {
                    setPassword(e.target.value);
                    campos.limpiar("password");
                  }}
                  placeholder="Mínimo 8 caracteres"
                  className={`${inputClass} pr-10`}
                  {...ariaErrorCampo("reg-password", campos.errores.password)}
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
              <ErrorCampo idCampo="reg-password" mensaje={campos.errores.password} />
            </div>

            {/* Repetir contraseña */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="reg-password-repeat" className="text-sm font-medium text-foreground">
                Repetir contraseña <Obligatorio />
              </label>
              <InputWrapper>
                <FieldIcon icon={Lock} />
                <input
                  id="reg-password-repeat"
                  type={showPasswordRepeat ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={passwordRepeat}
                  onChange={(e) => {
                    setPasswordRepeat(e.target.value);
                    campos.limpiar("passwordRepeat");
                  }}
                  placeholder="Repetí tu contraseña"
                  className={`${inputClass} pr-10 ${
                    passwordRepeatError
                      ? "border-danger focus:border-danger focus:ring-danger/20"
                      : ""
                  }`}
                  {...ariaErrorCampo("reg-password-repeat", campos.errores.passwordRepeat)}
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
              <ErrorCampo idCampo="reg-password-repeat" mensaje={campos.errores.passwordRepeat} />
              {passwordRepeatError && (
                <p className="flex items-center gap-1.5 text-xs text-danger">
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
          <Aviso tono="danger">
            <p>{submitError.mensaje}</p>
            {submitError.ref && (
              <p className="mt-1 text-sm">
                Si el problema sigue, comunicate con la Oficina de Empleo e indicá este código: {submitError.ref}
              </p>
            )}
          </Aviso>
        )}

        {/* ── Submit ─────────────────────────────────────────────────────── */}
        <button
          type="submit"
          id="reg-postulante-submit"
          disabled={isLoading || passwordRepeatError}
          aria-busy={isLoading}
          className="btn-primario w-full"
        >
          {isLoading ? (
            <Spinner />
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

    </div>
  );
}
