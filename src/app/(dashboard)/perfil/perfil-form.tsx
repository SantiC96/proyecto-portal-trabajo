"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Phone,
  MapPin,
  CreditCard,
  Mail,
  FileText,
  Upload,
  X,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  KeyRound,
  Pencil,
  Eye,
  EyeOff,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import {
  actualizarPerfil,
  subirAvatar,
  quitarAvatar,
  subirCV,
  eliminarCV,
  cambiarContrasena,
} from "./actions";

// ─── helpers ─────────────────────────────────────────────────────────────────

const inputClass =
  "w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-placeholder outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60";

const inputClassPassword =
  "w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-10 text-sm text-foreground placeholder:text-placeholder outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60";

const inputReadonlyClass =
  "w-full rounded-lg border border-border bg-surface-tinted py-2.5 pl-10 pr-4 text-sm text-muted-foreground-strong outline-none cursor-default";

function InputWrapper({ children }: { children: React.ReactNode }) {
  return <div className="relative">{children}</div>;
}

function FieldIcon({ icon: Icon }: { icon: React.ElementType }) {
  return (
    <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-icon" />
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-bold uppercase tracking-wider text-primary">{children}</h2>
  );
}

function CampoLectura({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <p className="mb-0.5 text-xs font-medium uppercase tracking-wider text-muted-icon">{label}</p>
      <p className="text-sm text-foreground">{valor || "—"}</p>
    </div>
  );
}

function MensajeError({ texto }: { texto: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{texto}</span>
    </div>
  );
}

function MensajeExito({ texto }: { texto: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{texto}</span>
    </div>
  );
}

// ─── tipos ───────────────────────────────────────────────────────────────────

interface PerfilFormProps {
  usuario: {
    nombre: string;
    apellido: string;
    telefono: string;
    rol: string | null;
    avatarActivo: { ruta: string; url: string | null } | null;
  };
  postulante: {
    id: string;
    dni: string;
    domicilio: string;
    cvActivo: {
      ruta: string;
      nombreOriginal: string;
      creadoEn: string;
      tamano: number;
      url: string | null;
    } | null;
  };
  email: string;
  categorias: { id: string; nombre: string }[];
  categoriasSeleccionadas: string[];
}

// ─── componente ──────────────────────────────────────────────────────────────

export function PerfilForm({
  usuario,
  postulante,
  email,
  categorias,
  categoriasSeleccionadas: categoriasIniciales,
}: PerfilFormProps) {
  const router = useRouter();

  // Modo edición
  const [modoEdicion, setModoEdicion] = useState(false);

  // Datos personales
  const [nombre, setNombre] = useState(usuario.nombre);
  const [apellido, setApellido] = useState(usuario.apellido);
  const [telefono, setTelefono] = useState(usuario.telefono);
  const [domicilio, setDomicilio] = useState(postulante.domicilio);
  const [categoriaIds, setCategoriaIds] = useState<string[]>(categoriasIniciales);

  // Guardar datos
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);
  const [errorPerfil, setErrorPerfil] = useState<string | null>(null);
  const [exitoPerfil, setExitoPerfil] = useState(false);

  // Avatar
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [guardandoAvatar, setGuardandoAvatar] = useState(false);
  const [errorAvatar, setErrorAvatar] = useState<string | null>(null);

  // CV
  const cvInputRef = useRef<HTMLInputElement>(null);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [guardandoCV, setGuardandoCV] = useState(false);
  const [errorCV, setErrorCV] = useState<string | null>(null);
  const [exitoCV, setExitoCV] = useState(false);

  // Contraseña
  const [mostrarFormContrasena, setMostrarFormContrasena] = useState(false);
  const [contrasenaActual, setContrasenaActual] = useState("");
  const [contrasenaNueva, setContrasenaNueva] = useState("");
  const [repetirContrasena, setRepetirContrasena] = useState("");
  const [mostrarActual, setMostrarActual] = useState(false);
  const [mostrarNueva, setMostrarNueva] = useState(false);
  const [mostrarRepetir, setMostrarRepetir] = useState(false);
  const [cargandoContrasena, setCargandoContrasena] = useState(false);
  const [errorContrasena, setErrorContrasena] = useState("");
  const [exitoContrasena, setExitoContrasena] = useState("");

  // Limpiar blob URL al desmontar
  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  // ── modo edición ────────────────────────────────────────────────────────────

  const handleEditarDatos = () => {
    setExitoPerfil(false);
    setErrorPerfil(null);
    setModoEdicion(true);
  };

  const handleCancelar = () => {
    setNombre(usuario.nombre);
    setApellido(usuario.apellido);
    setTelefono(usuario.telefono);
    setDomicilio(postulante.domicilio);
    setCategoriaIds(categoriasIniciales);
    setErrorPerfil(null);
    setExitoPerfil(false);
    setModoEdicion(false);
  };

  // ── avatar handlers ─────────────────────────────────────────────────────────

  const handleAvatarSelect = (file: File) => {
    const tipos = ["image/jpeg", "image/png", "image/webp"];
    if (!tipos.includes(file.type)) {
      setErrorAvatar("Solo se aceptan imágenes JPG, PNG o WEBP.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setErrorAvatar("La imagen no puede superar los 2 MB.");
      return;
    }
    setErrorAvatar(null);
    setAvatarFile(file);
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleGuardarAvatar = async () => {
    if (!avatarFile) return;
    setGuardandoAvatar(true);
    setErrorAvatar(null);
    const fd = new FormData();
    fd.append("avatar", avatarFile);
    try {
      const result = await subirAvatar(fd);
      if (result?.error) {
        setErrorAvatar(result.error);
      } else {
        if (avatarPreview) URL.revokeObjectURL(avatarPreview);
        setAvatarPreview(null);
        setAvatarFile(null);
        router.refresh();
      }
    } catch {
      setErrorAvatar("Ocurrió un error inesperado al subir la foto. Intentá de nuevo.");
    }
    setGuardandoAvatar(false);
  };

  const handleCancelarAvatar = () => {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarPreview(null);
    setAvatarFile(null);
    setErrorAvatar(null);
  };

  const handleQuitarAvatar = async () => {
    setGuardandoAvatar(true);
    setErrorAvatar(null);
    const result = await quitarAvatar();
    if (result?.error) {
      setErrorAvatar(result.error);
    } else {
      router.refresh();
    }
    setGuardandoAvatar(false);
  };

  // ── guardar perfil ──────────────────────────────────────────────────────────

  const handleGuardarPerfil = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardandoPerfil(true);
    setErrorPerfil(null);
    setExitoPerfil(false);
    const result = await actualizarPerfil({ nombre, apellido, telefono, domicilio, categoriaIds });
    if (result?.error) {
      setErrorPerfil(result.error);
    } else {
      // Normalizar estado con los valores guardados
      setNombre(nombre.trim());
      setApellido(apellido.trim());
      setTelefono(telefono.trim());
      setDomicilio(domicilio.trim());
      setExitoPerfil(true);
      setModoEdicion(false);
      router.refresh();
    }
    setGuardandoPerfil(false);
  };

  // ── cv handlers ─────────────────────────────────────────────────────────────

  const handleSeleccionarCV = (file: File) => {
    if (file.type !== "application/pdf") {
      setErrorCV("El CV debe ser un archivo PDF.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorCV("El CV no puede superar los 5 MB.");
      return;
    }
    setErrorCV(null);
    setCvFile(file);
  };

  const handleSubirCV = async () => {
    if (!cvFile) return;
    setGuardandoCV(true);
    setErrorCV(null);
    setExitoCV(false);
    const fd = new FormData();
    fd.append("cv", cvFile);
    try {
      const result = await subirCV(fd);
      if (result?.error) {
        setErrorCV(result.error);
      } else {
        setCvFile(null);
        setExitoCV(true);
        router.refresh();
      }
    } catch {
      setErrorCV("Ocurrió un error inesperado al subir el CV. Intentá de nuevo.");
    }
    setGuardandoCV(false);
  };

  const handleEliminarCV = async () => {
    setGuardandoCV(true);
    setErrorCV(null);
    setExitoCV(false);
    const result = await eliminarCV();
    if (result?.error) {
      setErrorCV(result.error);
    } else {
      router.refresh();
    }
    setGuardandoCV(false);
  };

  // ── contraseña handlers ─────────────────────────────────────────────────────

  const handleCambiarContrasena = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargandoContrasena(true);
    setErrorContrasena("");
    const fd = new FormData();
    fd.append("contrasenaActual", contrasenaActual);
    fd.append("contrasenaNueva", contrasenaNueva);
    fd.append("repetirContrasena", repetirContrasena);
    const res = await cambiarContrasena(fd);
    setCargandoContrasena(false);
    if (res.error) {
      setErrorContrasena(res.error);
    } else {
      setExitoContrasena("Tu contraseña se actualizó correctamente.");
      setMostrarFormContrasena(false);
      setContrasenaActual("");
      setContrasenaNueva("");
      setRepetirContrasena("");
    }
  };

  const handleCancelarContrasena = () => {
    setMostrarFormContrasena(false);
    setContrasenaActual("");
    setContrasenaNueva("");
    setRepetirContrasena("");
    setErrorContrasena("");
  };

  // ── render ──────────────────────────────────────────────────────────────────

  const avatarSrc = avatarPreview ?? usuario.avatarActivo?.url ?? undefined;
  const tieneAvatar = !!(usuario.avatarActivo || avatarPreview);

  return (
    <div className="flex flex-col gap-6">

      {/* ── 1. Avatar ──────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-white px-6 py-6 shadow-sm">
        <SectionTitle>Foto de perfil</SectionTitle>
        <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-6">
          <div className="shrink-0">
            <Avatar
              src={avatarSrc}
              nombre={usuario.nombre}
              apellido={usuario.apellido}
              size="lg"
            />
          </div>
          <div className="flex flex-1 flex-col gap-3">
            {avatarPreview ? (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-muted-foreground">
                  Vista previa lista. Guardá los cambios o cancelá.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleGuardarAvatar}
                    disabled={guardandoAvatar}
                    className="flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:opacity-60"
                  >
                    {guardandoAvatar ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    Guardar foto
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelarAvatar}
                    disabled={guardandoAvatar}
                    className="flex h-9 items-center gap-1.5 rounded-lg border border-border bg-white px-4 text-sm font-medium text-foreground transition hover:border-primary hover:text-primary disabled:opacity-60"
                  >
                    <X className="h-4 w-4" />
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={guardandoAvatar}
                  className="flex h-9 items-center gap-1.5 rounded-lg border border-border bg-white px-4 text-sm font-medium text-foreground transition hover:border-primary hover:text-primary disabled:opacity-60"
                >
                  <Upload className="h-4 w-4" />
                  {tieneAvatar ? "Cambiar foto" : "Subir foto"}
                </button>
                {tieneAvatar && (
                  <button
                    type="button"
                    onClick={handleQuitarAvatar}
                    disabled={guardandoAvatar}
                    className="flex h-9 items-center gap-1.5 rounded-lg border border-border bg-white px-4 text-sm font-medium text-muted-foreground transition hover:border-red-300 hover:text-red-500 disabled:opacity-60"
                  >
                    {guardandoAvatar ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : (
                      <X className="h-4 w-4" />
                    )}
                    Quitar foto
                  </button>
                )}
              </div>
            )}
            <p className="text-xs text-muted-icon">JPG, PNG o WEBP · Máximo 2 MB</p>
            {errorAvatar && <MensajeError texto={errorAvatar} />}
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-icon">
          Los archivos eliminados se conservan 90 días por seguridad y luego se borran definitivamente.
        </p>
        <input
          ref={avatarInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleAvatarSelect(file);
            e.target.value = "";
          }}
        />
      </div>

      {/* ── 2-3. Datos personales + Rubros ─────────────────────────────────── */}
      <form onSubmit={handleGuardarPerfil} className="flex flex-col gap-6">

        {/* Datos personales */}
        <div className="rounded-2xl border border-border bg-white px-6 py-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <SectionTitle>Datos personales</SectionTitle>
            {!modoEdicion && (
              <button
                type="button"
                onClick={handleEditarDatos}
                className="flex h-8 items-center gap-1.5 rounded-lg border border-border bg-white px-3 text-xs font-medium text-muted-foreground-strong transition hover:border-primary hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <Pencil className="h-3.5 w-3.5" />
                Editar datos
              </button>
            )}
          </div>

          {!modoEdicion ? (
            /* ── Modo lectura ── */
            <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
              <CampoLectura label="Nombre" valor={nombre} />
              <CampoLectura label="Apellido" valor={apellido} />
              <CampoLectura label="Teléfono / Celular" valor={telefono} />
              <CampoLectura label="Domicilio" valor={domicilio} />
              <CampoLectura label="DNI" valor={postulante.dni} />
              <CampoLectura label="Email" valor={email} />
            </div>
          ) : (
            /* ── Modo edición ── */
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="p-nombre" className="text-sm font-medium text-foreground">
                    Nombre <span className="text-red-500">*</span>
                  </label>
                  <InputWrapper>
                    <FieldIcon icon={User} />
                    <input
                      id="p-nombre"
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
                  <label htmlFor="p-apellido" className="text-sm font-medium text-foreground">
                    Apellido <span className="text-red-500">*</span>
                  </label>
                  <InputWrapper>
                    <FieldIcon icon={User} />
                    <input
                      id="p-apellido"
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

              <div className="flex flex-col gap-1.5">
                <label htmlFor="p-telefono" className="text-sm font-medium text-foreground">
                  Teléfono / Celular
                </label>
                <InputWrapper>
                  <FieldIcon icon={Phone} />
                  <input
                    id="p-telefono"
                    type="tel"
                    autoComplete="tel"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    placeholder="Ej: 341 5678901"
                    className={inputClass}
                  />
                </InputWrapper>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="p-domicilio" className="text-sm font-medium text-foreground">
                  Domicilio
                </label>
                <InputWrapper>
                  <FieldIcon icon={MapPin} />
                  <input
                    id="p-domicilio"
                    type="text"
                    autoComplete="street-address"
                    value={domicilio}
                    onChange={(e) => setDomicilio(e.target.value)}
                    placeholder="Calle y número (Ej: San Martín 432)"
                    className={inputClass}
                  />
                </InputWrapper>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="p-dni" className="text-sm font-medium text-foreground">
                  DNI <span className="ml-1 text-xs font-normal text-muted-icon">(no editable)</span>
                </label>
                <InputWrapper>
                  <FieldIcon icon={CreditCard} />
                  <input
                    id="p-dni"
                    type="text"
                    readOnly
                    value={postulante.dni}
                    className={inputReadonlyClass}
                    tabIndex={-1}
                  />
                </InputWrapper>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="p-email" className="text-sm font-medium text-foreground">
                  Email <span className="ml-1 text-xs font-normal text-muted-icon">(no editable)</span>
                </label>
                <InputWrapper>
                  <FieldIcon icon={Mail} />
                  <input
                    id="p-email"
                    type="email"
                    readOnly
                    value={email}
                    className={inputReadonlyClass}
                    tabIndex={-1}
                  />
                </InputWrapper>
              </div>
            </div>
          )}
        </div>

        {/* Rubros de interés */}
        <div className="rounded-2xl border border-border bg-white px-6 py-6 shadow-sm">
          <SectionTitle>Rubros de interés</SectionTitle>

          {!modoEdicion ? (
            /* ── Modo lectura ── */
            <div className="mt-4 flex flex-wrap gap-2">
              {categoriaIds.length > 0 ? (
                categorias
                  .filter((c) => categoriaIds.includes(c.id))
                  .map((c) => (
                    <span
                      key={c.id}
                      className="rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary"
                    >
                      {c.nombre}
                    </span>
                  ))
              ) : (
                <span className="text-sm text-muted-foreground">
                  No seleccionaste rubros todavía.
                </span>
              )}
            </div>
          ) : (
            /* ── Modo edición ── */
            <>
              <p className="mb-4 mt-1 text-sm text-muted-foreground">
                Seleccioná los rubros en los que te gustaría trabajar.
              </p>
              <div className="flex flex-wrap gap-2">
                {categorias.map((cat) => {
                  const seleccionado = categoriaIds.includes(cat.id);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() =>
                        setCategoriaIds((prev) =>
                          prev.includes(cat.id)
                            ? prev.filter((c) => c !== cat.id)
                            : [...prev, cat.id]
                        )
                      }
                      className={`rounded-full border px-4 py-1.5 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-primary/30 ${
                        seleccionado
                          ? "border-primary bg-primary text-white"
                          : "border-border bg-background text-muted-foreground-strong hover:border-primary/50 hover:text-primary"
                      }`}
                    >
                      {cat.nombre}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Mensajes y botones de acción — solo en modo edición */}
        {modoEdicion && (
          <>
            {errorPerfil && <MensajeError texto={errorPerfil} />}
            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={guardandoPerfil}
                className="flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-8 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {guardandoPerfil ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                {guardandoPerfil ? "Guardando…" : "Guardar cambios"}
              </button>
              <button
                type="button"
                onClick={handleCancelar}
                disabled={guardandoPerfil}
                className="flex h-11 items-center justify-center gap-2 rounded-lg border border-border bg-white px-8 text-sm font-medium text-foreground transition hover:border-primary hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
              >
                Cancelar
              </button>
            </div>
          </>
        )}

        {/* Mensaje de éxito — solo en modo lectura, después de guardar */}
        {!modoEdicion && exitoPerfil && (
          <MensajeExito texto="¡Perfil actualizado correctamente!" />
        )}

      </form>

      {/* ── 4. CV ──────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-white px-6 py-6 shadow-sm">
        <SectionTitle>Curriculum Vitae</SectionTitle>

        {!postulante.cvActivo ? (
          <div className="mt-4 flex flex-col gap-4">
            <div className="rounded-lg border border-border bg-secondary px-4 py-4">
              <p className="text-sm font-semibold text-foreground">
                Todavía no subiste tu CV
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Subí tu currículum en PDF para que las empresas y la oficina de empleo puedan conocer tu experiencia. Es un paso clave para postularte a las ofertas disponibles.
              </p>
            </div>

            {cvFile ? (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-tinted px-4 py-3">
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 shrink-0 text-primary" />
                  <div>
                    <p className="break-all text-sm font-medium text-foreground">{cvFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(cvFile.size / 1024).toFixed(0)} KB · PDF
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setCvFile(null); setErrorCV(null); }}
                  className="shrink-0 rounded-full p-1 text-muted-foreground transition hover:bg-red-50 hover:text-red-500"
                  aria-label="Quitar archivo"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => cvInputRef.current?.click()}
                className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-background px-6 py-8 text-center transition hover:border-primary/50 hover:bg-surface-tinted"
              >
                <Upload className="h-8 w-8 text-muted-icon" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Hacé clic para seleccionar tu CV
                  </p>
                  <p className="mt-1 text-xs text-muted-icon">Solo PDF · Máximo 5 MB</p>
                </div>
              </button>
            )}

            {errorCV && <MensajeError texto={errorCV} />}
            {exitoCV && <MensajeExito texto="¡CV subido correctamente!" />}

            {cvFile && (
              <button
                type="button"
                onClick={handleSubirCV}
                disabled={guardandoCV}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover disabled:opacity-60 sm:w-auto sm:px-8 sm:self-start"
              >
                {guardandoCV ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {guardandoCV ? "Subiendo…" : "Subir CV"}
              </button>
            )}
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-tinted px-4 py-3">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 shrink-0 text-primary" />
                <div>
                  <p className="break-all text-sm font-medium text-foreground">
                    {postulante.cvActivo.nombreOriginal}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {postulante.cvActivo.tamano > 0
                      ? `${(postulante.cvActivo.tamano / 1024).toFixed(0)} KB · `
                      : ""}
                    PDF · Subido el{" "}
                    {new Date(postulante.cvActivo.creadoEn).toLocaleDateString("es-AR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {postulante.cvActivo.url && (
                  <a
                    href={postulante.cvActivo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-9 items-center gap-1.5 rounded-lg border border-border bg-white px-3 text-sm font-medium text-foreground transition hover:border-primary hover:text-primary"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Ver CV
                  </a>
                )}
                <button
                  type="button"
                  onClick={handleEliminarCV}
                  disabled={guardandoCV}
                  className="flex h-9 items-center gap-1.5 rounded-lg border border-border bg-white px-3 text-sm font-medium text-muted-foreground transition hover:border-red-300 hover:text-red-500 disabled:opacity-60"
                  aria-label="Eliminar CV"
                >
                  {guardandoCV ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {cvFile ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/30 bg-surface-tinted px-4 py-3">
                  <div className="flex items-center gap-3">
                    <FileText className="h-6 w-6 shrink-0 text-primary" />
                    <div>
                      <p className="break-all text-sm font-medium text-foreground">{cvFile.name}</p>
                      <p className="text-xs text-muted-foreground">{(cvFile.size / 1024).toFixed(0)} KB</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setCvFile(null); setErrorCV(null); }}
                    className="shrink-0 rounded-full p-1 text-muted-foreground hover:text-red-500"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSubirCV}
                    disabled={guardandoCV}
                    className="flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:opacity-60"
                  >
                    {guardandoCV ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : null}
                    {guardandoCV ? "Subiendo…" : "Reemplazar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setCvFile(null); setErrorCV(null); }}
                    disabled={guardandoCV}
                    className="flex h-9 items-center gap-1.5 rounded-lg border border-border bg-white px-4 text-sm font-medium text-foreground transition hover:border-primary hover:text-primary disabled:opacity-60"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => cvInputRef.current?.click()}
                disabled={guardandoCV}
                className="flex h-9 w-fit items-center gap-1.5 rounded-lg border border-border bg-white px-4 text-sm font-medium text-foreground transition hover:border-primary hover:text-primary disabled:opacity-60"
              >
                <Upload className="h-4 w-4" />
                Reemplazar CV
              </button>
            )}

            {errorCV && <MensajeError texto={errorCV} />}
            {exitoCV && <MensajeExito texto="¡CV actualizado correctamente!" />}
          </div>
        )}

        <p className="mt-2 text-xs text-muted-icon">
          Los archivos eliminados se conservan 90 días por seguridad y luego se borran definitivamente.
        </p>
        <input
          ref={cvInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleSeleccionarCV(file);
            e.target.value = "";
          }}
        />
      </div>

      {/* ── 5. Contraseña ──────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-white px-6 py-5 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-foreground">Contraseña</p>
            <p className="text-xs text-muted-foreground">Cambiá tu contraseña de acceso.</p>
          </div>
          {!mostrarFormContrasena && (
            <button
              type="button"
              onClick={() => { setMostrarFormContrasena(true); setExitoContrasena(""); }}
              className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-white px-4 text-sm font-medium text-foreground transition hover:border-primary hover:text-primary"
            >
              <KeyRound className="h-4 w-4" />
              Cambiar contraseña
            </button>
          )}
        </div>

        {exitoContrasena && !mostrarFormContrasena && (
          <div className="mt-4">
            <MensajeExito texto={exitoContrasena} />
          </div>
        )}

        {mostrarFormContrasena && (
          <form onSubmit={handleCambiarContrasena} className="mt-5 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="p-contrasena-actual" className="text-sm font-medium text-foreground">
                Contraseña actual
              </label>
              <InputWrapper>
                <FieldIcon icon={KeyRound} />
                <input
                  id="p-contrasena-actual"
                  type={mostrarActual ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={contrasenaActual}
                  onChange={(e) => setContrasenaActual(e.target.value)}
                  placeholder="Tu contraseña actual"
                  className={inputClassPassword}
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
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="p-contrasena-nueva" className="text-sm font-medium text-foreground">
                Contraseña nueva
              </label>
              <InputWrapper>
                <FieldIcon icon={KeyRound} />
                <input
                  id="p-contrasena-nueva"
                  type={mostrarNueva ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={contrasenaNueva}
                  onChange={(e) => setContrasenaNueva(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className={inputClassPassword}
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
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="p-repetir-contrasena" className="text-sm font-medium text-foreground">
                Repetir contraseña nueva
              </label>
              <InputWrapper>
                <FieldIcon icon={KeyRound} />
                <input
                  id="p-repetir-contrasena"
                  type={mostrarRepetir ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={repetirContrasena}
                  onChange={(e) => setRepetirContrasena(e.target.value)}
                  placeholder="Repetí la contraseña nueva"
                  className={inputClassPassword}
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
            </div>

            {errorContrasena && <MensajeError texto={errorContrasena} />}

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="submit"
                disabled={cargandoContrasena}
                className="flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-6 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:opacity-60"
              >
                {cargandoContrasena ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                {cargandoContrasena ? "Guardando…" : "Guardar"}
              </button>
              <button
                type="button"
                onClick={handleCancelarContrasena}
                disabled={cargandoContrasena}
                className="flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-white px-6 text-sm font-medium text-foreground transition hover:border-primary hover:text-primary disabled:opacity-60"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>

    </div>
  );
}
