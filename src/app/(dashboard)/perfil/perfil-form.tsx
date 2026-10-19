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
import { AvatarAjustado } from "@/components/ui/avatar-ajustado";
import { FotoPerfilModal } from "@/components/ui/foto-perfil-modal";
import { MultiCombobox } from "@/components/ui/multi-combobox";
import {
  actualizarPerfil,
  actualizarRubros,
  subirAvatar,
  quitarAvatar,
  subirCV,
  eliminarCV,
  cambiarContrasena,
} from "./actions";
import { LARGO_MAXIMO, validarNombre, validarDNI, validarTelefono } from "@/lib/validaciones";
import type { Rol, Tabla } from "@/types/db";
import type { ErrorAccion } from "@/lib/resultado";
import { mostrarAviso } from "@/lib/avisos";
import { useAccion } from "@/lib/use-accion";
import { Spinner } from "@/components/ui/spinner";
import { DialogoConfirmacion } from "@/components/ui/dialogo-confirmacion";
import {
  AVATAR_ACCEPT,
  AVATAR_HELP_TEXT,
  AVATAR_MAX_SIZE,
  CV_ACCEPT,
  CV_HELP_TEXT,
  CV_MAX_SIZE,
  ERRORES_ARCHIVO,
  validarTipoAvatar,
  validarTipoCV,
} from "@/lib/archivos";
import {
  CLASE_CONTROL_INVALIDO,
  ErrorCampo,
  Obligatorio,
  ariaErrorCampo,
} from "@/components/ui/obligatorio";
import { useErroresCampo } from "@/lib/use-errores-campo";
import { ContadorCaracteres } from "@/components/ui/contador-caracteres";
import {
  DISPONIBILIDADES,
  DISPONIBILIDAD_LABEL,
  LARGO_MAXIMO_EXPERIENCIA,
  NIVELES_EDUCATIVOS,
  NIVEL_EDUCATIVO_LABEL,
  SIN_COMPLETAR,
  SITUACIONES_LABORALES,
  SITUACION_LABORAL_LABEL,
  etiquetaDisponibilidad,
  etiquetaNivelEducativo,
  etiquetaSituacionLaboral,
} from "@/lib/informacion-laboral";
import { formatFecha } from "@/lib/fechas";

type CampoDatos =
  | "nombre"
  | "apellido"
  | "telefono"
  | "domicilio"
  | "dni"
  | "nivelEducativo"
  | "situacionLaboral"
  | "disponibilidad"
  | "experienciaLaboral";
type CampoContrasena = "contrasenaActual" | "contrasenaNueva" | "repetirContrasena";

const CAMPOS_DATOS: readonly CampoDatos[] = [
  "nombre",
  "apellido",
  "telefono",
  "domicilio",
  "dni",
  "nivelEducativo",
  "situacionLaboral",
  "disponibilidad",
  "experienciaLaboral",
];
const CAMPOS_CONTRASENA: readonly CampoContrasena[] = [
  "contrasenaActual",
  "contrasenaNueva",
  "repetirContrasena",
];

type AjusteAvatar = { x: number; y: number; zoom: number };

// ─── helpers ─────────────────────────────────────────────────────────────────

const inputClass =
  "w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-placeholder outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60 " +
  CLASE_CONTROL_INVALIDO;

const inputClassPassword =
  "w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-10 text-sm text-foreground placeholder:text-placeholder outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60 " +
  CLASE_CONTROL_INVALIDO;

const selectClass =
  "min-h-11 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60 " +
  CLASE_CONTROL_INVALIDO;

const textareaClass =
  "min-h-32 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-placeholder outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60 " +
  CLASE_CONTROL_INVALIDO;

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

function CampoLectura({
  label,
  valor,
  vacio = "—",
  className,
}: {
  label: string;
  valor: string;
  vacio?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="mb-0.5 text-xs font-medium uppercase tracking-wider text-muted-icon">{label}</p>
      <p
        className={`whitespace-pre-line break-words text-sm ${valor ? "text-foreground" : "text-muted-foreground"}`}
      >
        {valor || vacio}
      </p>
    </div>
  );
}

function MensajeError({ error }: { error: ErrorAccion }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
      <div className="flex items-start gap-2.5">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{error.mensaje}</span>
      </div>
      {error.ref && (
        <p className="ml-7 text-xs text-gray-500">
          Si el problema sigue, comunicate con la Oficina de Empleo e indicá este código: {error.ref}
        </p>
      )}
    </div>
  );
}

// ─── tipos ───────────────────────────────────────────────────────────────────

interface PerfilFormProps {
  usuario: {
    nombre: string;
    apellido: string;
    telefono: string;
    rol: Rol | null;
    avatarActivo: { ruta: string; url: string | null; ajuste: AjusteAvatar } | null;
  };
  postulante: {
    id: string;
    dni: string;
    domicilio: string;
    nivelEducativo: string;
    situacionLaboral: string;
    disponibilidad: string;
    experienciaLaboral: string;
    cvActivo: {
      ruta: string;
      nombreOriginal: string;
      creadoEn: string;
      tamano: number;
      url: string | null;
    } | null;
  };
  email: string;
  categorias: Pick<Tabla<"categorias">, "id" | "nombre">[];
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

  // Modo edición — datos personales
  const [modoEdicionDatos, setModoEdicionDatos] = useState(false);
  const { pendiente: guardandoDatos, ejecutar: ejecutarDatos } = useAccion();
  const camposDatos = useErroresCampo<CampoDatos>();

  // Datos personales
  const [nombre, setNombre] = useState(usuario.nombre);
  const [apellido, setApellido] = useState(usuario.apellido);
  const [telefono, setTelefono] = useState(usuario.telefono);
  const [domicilio, setDomicilio] = useState(postulante.domicilio);
  const [dni, setDni] = useState(postulante.dni);

  // Información laboral (se guarda junto con los datos personales)
  const [nivelEducativo, setNivelEducativo] = useState(postulante.nivelEducativo);
  const [situacionLaboral, setSituacionLaboral] = useState(postulante.situacionLaboral);
  const [disponibilidad, setDisponibilidad] = useState(postulante.disponibilidad);
  const [experienciaLaboral, setExperienciaLaboral] = useState(postulante.experienciaLaboral);

  // Modo edición — rubros de interés
  const [modoEdicionRubros, setModoEdicionRubros] = useState(false);
  const { pendiente: guardandoRubros, ejecutar: ejecutarRubros } = useAccion();

  const [categoriaIds, setCategoriaIds] = useState<string[]>(categoriasIniciales);

  // Avatar
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const { pendiente: guardandoAvatar, ejecutar: ejecutarAvatar } = useAccion();
  // Solo errores de la validación del archivo en el navegador: los del servidor van en el toast.
  const [errorAvatar, setErrorAvatar] = useState<ErrorAccion | null>(null);

  // Modal foto
  const [modalFotoAbierto, setModalFotoAbierto] = useState(false);
  const [modalModo, setModalModo] = useState<"ver" | "ajustar">("ver");
  const [ajusteActual, setAjusteActual] = useState<AjusteAvatar>(
    usuario.avatarActivo?.ajuste ?? { x: 50, y: 50, zoom: 1 }
  );
  // Flag para abrir el editor automáticamente tras subir una foto nueva
  const abrirEditorTrasRefresh = useRef(false);

  // CV
  const cvInputRef = useRef<HTMLInputElement>(null);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const { pendiente: subiendoCV, ejecutar: ejecutarCV } = useAccion();
  // Solo errores de la validación del archivo en el navegador: los del servidor van en el toast.
  const [errorCV, setErrorCV] = useState<ErrorAccion | null>(null);

  // Contraseña
  const [mostrarFormContrasena, setMostrarFormContrasena] = useState(false);
  const [contrasenaActual, setContrasenaActual] = useState("");
  const [contrasenaNueva, setContrasenaNueva] = useState("");
  const [repetirContrasena, setRepetirContrasena] = useState("");
  const [mostrarActual, setMostrarActual] = useState(false);
  const [mostrarNueva, setMostrarNueva] = useState(false);
  const [mostrarRepetir, setMostrarRepetir] = useState(false);
  const { pendiente: cargandoContrasena, ejecutar: ejecutarContrasena } = useAccion();
  const camposContrasena = useErroresCampo<CampoContrasena>();

  // Limpiar blob URL al desmontar
  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  // Abrir editor de ajuste cuando llega el nuevo avatarActivo tras subir foto
  useEffect(() => {
    if (abrirEditorTrasRefresh.current && usuario.avatarActivo) {
      abrirEditorTrasRefresh.current = false;
      setAjusteActual({ x: 50, y: 50, zoom: 1 });
      setModalModo("ajustar");
      setModalFotoAbierto(true);
    }
  }, [usuario.avatarActivo]);

  // ── handlers datos personales ────────────────────────────────────────────────

  const handleCancelarDatos = () => {
    setNombre(usuario.nombre);
    setApellido(usuario.apellido);
    setTelefono(usuario.telefono);
    setDomicilio(postulante.domicilio);
    setDni(postulante.dni);
    setNivelEducativo(postulante.nivelEducativo);
    setSituacionLaboral(postulante.situacionLaboral);
    setDisponibilidad(postulante.disponibilidad);
    setExperienciaLaboral(postulante.experienciaLaboral);
    camposDatos.limpiarTodos();
    setModoEdicionDatos(false);
  };

  // ── handlers rubros ──────────────────────────────────────────────────────────

  const handleCancelarRubros = () => {
    setCategoriaIds(categoriasIniciales);
    setModoEdicionRubros(false);
  };

  // ── avatar handlers ─────────────────────────────────────────────────────────

  const handleAvatarSelect = (file: File) => {
    if (!validarTipoAvatar(file.type)) {
      setErrorAvatar({ mensaje: ERRORES_ARCHIVO.avatarTipo });
      return;
    }
    if (file.size > AVATAR_MAX_SIZE) {
      setErrorAvatar({ mensaje: ERRORES_ARCHIVO.avatarTamano });
      return;
    }
    setErrorAvatar(null);
    setAvatarFile(file);
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleGuardarAvatar = () => {
    if (!avatarFile) return;
    setErrorAvatar(null);
    const fd = new FormData();
    fd.append("avatar", avatarFile);
    ejecutarAvatar(async () => {
      const result = await subirAvatar(fd);
      mostrarAviso(result);
      if (!result.ok) return;
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
      setAvatarPreview(null);
      setAvatarFile(null);
      // El editor se abre cuando llega el nuevo avatarActivo tras el refresh
      abrirEditorTrasRefresh.current = true;
      router.refresh();
    });
  };

  const handleCancelarAvatar = () => {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarPreview(null);
    setAvatarFile(null);
    setErrorAvatar(null);
  };

  // ── guardar datos personales ─────────────────────────────────────────────────

  const handleGuardarDatos = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!camposDatos.validar({ nombre, apellido, dni }, e.currentTarget)) return;
    const erroresCliente = [
      ["nombre", validarNombre(nombre)],
      ["apellido", validarNombre(apellido)],
      ["dni", validarDNI(dni)],
      ["telefono", validarTelefono(telefono)],
    ] as const;
    const primerError = erroresCliente.find(([, mensaje]) => mensaje);
    if (primerError?.[1]) {
      camposDatos.marcar(primerError[0], primerError[1]);
      return;
    }
    ejecutarDatos(async () => {
      const result = await actualizarPerfil({
        nombre,
        apellido,
        telefono,
        domicilio,
        dni,
        nivelEducativo,
        situacionLaboral,
        disponibilidad,
        experienciaLaboral,
      });
      if (!camposDatos.tomarDelServidor(result, CAMPOS_DATOS)) mostrarAviso(result);
      if (!result.ok) return;
      setNombre(nombre.trim());
      setApellido(apellido.trim());
      setTelefono(telefono.trim());
      setDomicilio(domicilio.trim());
      setDni(dni.replace(/\D/g, ""));
      setExperienciaLaboral(experienciaLaboral.trim());
      setModoEdicionDatos(false);
      router.refresh();
    });
  };

  // ── guardar rubros ───────────────────────────────────────────────────────────

  const handleGuardarRubros = (e: React.FormEvent) => {
    e.preventDefault();
    ejecutarRubros(async () => {
      const result = await actualizarRubros(categoriaIds);
      mostrarAviso(result);
      if (!result.ok) return;
      setModoEdicionRubros(false);
      router.refresh();
    });
  };

  // ── cv handlers ─────────────────────────────────────────────────────────────

  const handleSeleccionarCV = (file: File) => {
    setErrorCV(null);
    if (!validarTipoCV(file.type)) {
      setErrorCV({ mensaje: ERRORES_ARCHIVO.cvTipo });
      return;
    }
    if (file.size > CV_MAX_SIZE) {
      setErrorCV({ mensaje: ERRORES_ARCHIVO.cvTamano });
      return;
    }
    setCvFile(file);
    const fd = new FormData();
    fd.append("cv", file);
    ejecutarCV(async () => {
      try {
        const result = await subirCV(fd);
        mostrarAviso(result);
        if (result.ok) router.refresh();
      } finally {
        setCvFile(null);
      }
    });
  };

  // ── contraseña handlers ─────────────────────────────────────────────────────

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
      setMostrarFormContrasena(false);
      setContrasenaActual("");
      setContrasenaNueva("");
      setRepetirContrasena("");
    });
  };

  const handleCancelarContrasena = () => {
    setMostrarFormContrasena(false);
    setContrasenaActual("");
    setContrasenaNueva("");
    setRepetirContrasena("");
    camposContrasena.limpiarTodos();
  };

  // ── render ──────────────────────────────────────────────────────────────────

  const avatarSrc = avatarPreview ?? usuario.avatarActivo?.url ?? undefined;
  const tieneAvatar = !!(usuario.avatarActivo || avatarPreview);
  const puedeVerFoto = !!(usuario.avatarActivo && !avatarPreview);

  return (
    <div className="flex flex-col gap-6">

      {/* ── 1. Avatar ──────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-white px-4 py-5 shadow-sm sm:px-6 sm:py-6">
        <SectionTitle>Foto de perfil</SectionTitle>
        <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-6">
          <div className="shrink-0">
            {puedeVerFoto ? (
              <button
                type="button"
                className="cursor-zoom-in rounded-full focus:outline-none focus:ring-2 focus:ring-primary/40"
                aria-label="Ver foto de perfil"
                onClick={() => {
                  setModalModo("ver");
                  setModalFotoAbierto(true);
                }}
              >
                <AvatarAjustado
                  src={avatarSrc}
                  alt={`Foto de ${usuario.nombre} ${usuario.apellido}`.trim()}
                  ajuste={ajusteActual}
                  size="lg"
                />
              </button>
            ) : (
              <AvatarAjustado
                src={avatarSrc}
                alt={`Foto de ${usuario.nombre} ${usuario.apellido}`.trim()}
                ajuste={ajusteActual}
                size="lg"
              />
            )}
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
                    aria-busy={guardandoAvatar}
                    className="btn-primario min-h-11 sm:min-h-9"
                  >
                    {guardandoAvatar ? <Spinner /> : <CheckCircle2 className="h-4 w-4" />}
                    {guardandoAvatar ? "Guardando…" : "Guardar foto"}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelarAvatar}
                    disabled={guardandoAvatar}
                    className="btn-secundario inline-flex min-h-11 items-center gap-1.5 px-4 text-sm font-medium sm:min-h-9"
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
                  className="btn-secundario inline-flex min-h-11 items-center gap-1.5 px-4 text-sm font-medium sm:min-h-9"
                >
                  <Upload className="h-4 w-4" />
                  {tieneAvatar ? "Cambiar foto" : "Subir foto"}
                </button>
                {tieneAvatar && (
                  <DialogoConfirmacion
                    textoBoton={
                      <>
                        <X className="h-4 w-4" />
                        Quitar foto
                      </>
                    }
                    estiloBoton="peligro"
                    claseBoton="sm:min-h-9"
                    deshabilitado={guardandoAvatar}
                    titulo="¿Quitar tu foto de perfil?"
                    descripcion="Tu perfil va a mostrar tus iniciales en lugar de la foto. Podés subir otra cuando quieras."
                    textoConfirmar="Sí, quitar"
                    textoPendiente="Quitando…"
                    destructivo
                    accion={quitarAvatar}
                    onExito={() => router.refresh()}
                  />
                )}
              </div>
            )}
            <p className="text-xs text-muted-icon">{AVATAR_HELP_TEXT}</p>
            {errorAvatar && <MensajeError error={errorAvatar} />}
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-icon">
          Los archivos eliminados se conservan 90 días por seguridad y luego se borran definitivamente.
        </p>
        <input
          ref={avatarInputRef}
          type="file"
          accept={AVATAR_ACCEPT}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleAvatarSelect(file);
            e.target.value = "";
          }}
        />
      </div>

      {/* ── 2. Datos personales ────────────────────────────────────────────── */}
      <form onSubmit={handleGuardarDatos} noValidate>
        <div className="rounded-2xl border border-border bg-white px-4 py-5 shadow-sm sm:px-6 sm:py-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <SectionTitle>Datos personales</SectionTitle>
            {!modoEdicionDatos && (
              <button
                type="button"
                onClick={() => setModoEdicionDatos(true)}
                className="btn-secundario inline-flex min-h-11 items-center gap-1.5 px-3 text-xs font-medium sm:min-h-9"
              >
                <Pencil className="h-3.5 w-3.5" />
                Editar datos
              </button>
            )}
          </div>

          {!modoEdicionDatos ? (
            /* ── Modo lectura ── */
            <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
              <CampoLectura label="Nombre" valor={nombre} />
              <CampoLectura label="Apellido" valor={apellido} />
              <CampoLectura label="Teléfono / Celular" valor={telefono} />
              <CampoLectura label="Domicilio" valor={domicilio} />
              <CampoLectura label="DNI" valor={dni} />
              <CampoLectura label="Email" valor={email} />
            </div>
          ) : (
            /* ── Modo edición ── */
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="p-nombre" className="text-sm font-medium text-foreground">
                    Nombre <Obligatorio />
                  </label>
                  <InputWrapper>
                    <FieldIcon icon={User} />
                    <input
                      id="p-nombre"
                      type="text"
                      autoComplete="given-name"
                      required
                      value={nombre}
                      onChange={(e) => {
                        setNombre(e.target.value);
                        camposDatos.limpiar("nombre");
                      }}
                      placeholder="Ej: María"
                      className={inputClass}
                      {...ariaErrorCampo("p-nombre", camposDatos.errores.nombre)}
                    />
                  </InputWrapper>
                  <ErrorCampo idCampo="p-nombre" mensaje={camposDatos.errores.nombre} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="p-apellido" className="text-sm font-medium text-foreground">
                    Apellido <Obligatorio />
                  </label>
                  <InputWrapper>
                    <FieldIcon icon={User} />
                    <input
                      id="p-apellido"
                      type="text"
                      autoComplete="family-name"
                      required
                      value={apellido}
                      onChange={(e) => {
                        setApellido(e.target.value);
                        camposDatos.limpiar("apellido");
                      }}
                      placeholder="Ej: González"
                      className={inputClass}
                      {...ariaErrorCampo("p-apellido", camposDatos.errores.apellido)}
                    />
                  </InputWrapper>
                  <ErrorCampo idCampo="p-apellido" mensaje={camposDatos.errores.apellido} />
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
                    onChange={(e) => {
                      setTelefono(e.target.value);
                      camposDatos.limpiar("telefono");
                    }}
                    placeholder="Ej: 341 5678901"
                    className={inputClass}
                    {...ariaErrorCampo("p-telefono", camposDatos.errores.telefono)}
                  />
                </InputWrapper>
                <ErrorCampo idCampo="p-telefono" mensaje={camposDatos.errores.telefono} />
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
                    onChange={(e) => {
                      setDomicilio(e.target.value);
                      camposDatos.limpiar("domicilio");
                    }}
                    placeholder="Calle y número (Ej: San Martín 432)"
                    maxLength={LARGO_MAXIMO.domicilio}
                    className={inputClass}
                    {...ariaErrorCampo("p-domicilio", camposDatos.errores.domicilio)}
                  />
                </InputWrapper>
                <ErrorCampo idCampo="p-domicilio" mensaje={camposDatos.errores.domicilio} />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="p-dni" className="text-sm font-medium text-foreground">
                  DNI <Obligatorio />
                </label>
                <InputWrapper>
                  <FieldIcon icon={CreditCard} />
                  <input
                    id="p-dni"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    required
                    value={dni}
                    onChange={(e) => {
                      setDni(e.target.value.replace(/\D/g, "").slice(0, 8));
                      camposDatos.limpiar("dni");
                    }}
                    placeholder="12345678"
                    className={inputClass}
                    {...ariaErrorCampo("p-dni", camposDatos.errores.dni)}
                  />
                </InputWrapper>
                <ErrorCampo idCampo="p-dni" mensaje={camposDatos.errores.dni} />
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

          {/* ── Información laboral (se guarda con los datos personales) ── */}
          <div className="mt-8 border-t border-border pt-6">
            <SectionTitle>Información laboral</SectionTitle>
            <p className="mt-1 text-xs text-muted-icon">
              Opcional. La ven la Oficina de Empleo y las empresas a las que te deriven.
            </p>

            {!modoEdicionDatos ? (
              <div className="mt-4 grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
                <CampoLectura
                  label="Nivel educativo"
                  valor={etiquetaNivelEducativo(nivelEducativo) ?? ""}
                  vacio={SIN_COMPLETAR}
                />
                <CampoLectura
                  label="Situación laboral"
                  valor={etiquetaSituacionLaboral(situacionLaboral) ?? ""}
                  vacio={SIN_COMPLETAR}
                />
                <CampoLectura
                  label="Disponibilidad horaria"
                  valor={etiquetaDisponibilidad(disponibilidad) ?? ""}
                  vacio={SIN_COMPLETAR}
                />
                <CampoLectura
                  label="Experiencia laboral"
                  valor={experienciaLaboral}
                  vacio={SIN_COMPLETAR}
                  className="sm:col-span-2"
                />
              </div>
            ) : (
              <div className="mt-4 flex flex-col gap-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="p-nivel-educativo" className="text-sm font-medium text-foreground">
                      Nivel educativo
                    </label>
                    <select
                      id="p-nivel-educativo"
                      value={nivelEducativo}
                      onChange={(e) => {
                        setNivelEducativo(e.target.value);
                        camposDatos.limpiar("nivelEducativo");
                      }}
                      className={selectClass}
                      {...ariaErrorCampo("p-nivel-educativo", camposDatos.errores.nivelEducativo)}
                    >
                      <option value="">{SIN_COMPLETAR}</option>
                      {NIVELES_EDUCATIVOS.map((v) => (
                        <option key={v} value={v}>
                          {NIVEL_EDUCATIVO_LABEL[v]}
                        </option>
                      ))}
                    </select>
                    <ErrorCampo idCampo="p-nivel-educativo" mensaje={camposDatos.errores.nivelEducativo} />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="p-situacion-laboral" className="text-sm font-medium text-foreground">
                      Situación laboral
                    </label>
                    <select
                      id="p-situacion-laboral"
                      value={situacionLaboral}
                      onChange={(e) => {
                        setSituacionLaboral(e.target.value);
                        camposDatos.limpiar("situacionLaboral");
                      }}
                      className={selectClass}
                      {...ariaErrorCampo("p-situacion-laboral", camposDatos.errores.situacionLaboral)}
                    >
                      <option value="">{SIN_COMPLETAR}</option>
                      {SITUACIONES_LABORALES.map((v) => (
                        <option key={v} value={v}>
                          {SITUACION_LABORAL_LABEL[v]}
                        </option>
                      ))}
                    </select>
                    <ErrorCampo idCampo="p-situacion-laboral" mensaje={camposDatos.errores.situacionLaboral} />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="p-disponibilidad" className="text-sm font-medium text-foreground">
                      Disponibilidad horaria
                    </label>
                    <select
                      id="p-disponibilidad"
                      value={disponibilidad}
                      onChange={(e) => {
                        setDisponibilidad(e.target.value);
                        camposDatos.limpiar("disponibilidad");
                      }}
                      className={selectClass}
                      {...ariaErrorCampo("p-disponibilidad", camposDatos.errores.disponibilidad)}
                    >
                      <option value="">{SIN_COMPLETAR}</option>
                      {DISPONIBILIDADES.map((v) => (
                        <option key={v} value={v}>
                          {DISPONIBILIDAD_LABEL[v]}
                        </option>
                      ))}
                    </select>
                    <ErrorCampo idCampo="p-disponibilidad" mensaje={camposDatos.errores.disponibilidad} />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="p-experiencia-laboral" className="text-sm font-medium text-foreground">
                    Experiencia laboral
                  </label>
                  <textarea
                    id="p-experiencia-laboral"
                    value={experienciaLaboral}
                    onChange={(e) => {
                      setExperienciaLaboral(e.target.value);
                      camposDatos.limpiar("experienciaLaboral");
                    }}
                    placeholder="Contá en qué trabajaste, dónde y durante cuánto tiempo."
                    maxLength={LARGO_MAXIMO_EXPERIENCIA}
                    className={textareaClass}
                    {...ariaErrorCampo("p-experiencia-laboral", camposDatos.errores.experienciaLaboral)}
                  />
                  <ErrorCampo
                    idCampo="p-experiencia-laboral"
                    mensaje={camposDatos.errores.experienciaLaboral}
                  />
                  <ContadorCaracteres
                    actual={experienciaLaboral.length}
                    maximo={LARGO_MAXIMO_EXPERIENCIA}
                  />
                </div>
              </div>
            )}
          </div>

          {modoEdicionDatos && (
            <div className="mt-6 flex flex-col gap-4">
              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={guardandoDatos}
                  aria-busy={guardandoDatos}
                  className="btn-primario min-h-11 justify-center px-6"
                >
                  {guardandoDatos ? <Spinner /> : <CheckCircle2 className="h-4 w-4" />}
                  {guardandoDatos ? "Guardando…" : "Guardar datos"}
                </button>
                <button
                  type="button"
                  onClick={handleCancelarDatos}
                  disabled={guardandoDatos}
                  className="btn-secundario inline-flex min-h-11 items-center justify-center px-6 text-sm font-medium"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

        </div>
      </form>

      {/* ── 3. Rubros de interés ───────────────────────────────────────────── */}
      <form onSubmit={handleGuardarRubros}>
        <div className="rounded-2xl border border-border bg-white px-4 py-5 shadow-sm sm:px-6 sm:py-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <SectionTitle>Rubros de interés</SectionTitle>
            {!modoEdicionRubros && (
              <button
                type="button"
                onClick={() => setModoEdicionRubros(true)}
                className="btn-secundario inline-flex min-h-11 items-center gap-1.5 px-3 text-xs font-medium sm:min-h-9"
              >
                <Pencil className="h-3.5 w-3.5" />
                Editar rubros
              </button>
            )}
          </div>

          {!modoEdicionRubros ? (
            /* ── Modo lectura ── */
            <div className="flex flex-wrap gap-2">
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
              <MultiCombobox
                opciones={categorias}
                seleccionados={categoriaIds}
                onChange={setCategoriaIds}
                placeholder="Buscá o elegí rubros…"
                id="rubros-combobox"
              />
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={guardandoRubros}
                  aria-busy={guardandoRubros}
                  className="btn-primario min-h-11 justify-center px-6"
                >
                  {guardandoRubros ? <Spinner /> : <CheckCircle2 className="h-4 w-4" />}
                  {guardandoRubros ? "Guardando…" : "Guardar rubros"}
                </button>
                <button
                  type="button"
                  onClick={handleCancelarRubros}
                  disabled={guardandoRubros}
                  className="btn-secundario inline-flex min-h-11 items-center justify-center px-6 text-sm font-medium"
                >
                  Cancelar
                </button>
              </div>
            </>
          )}

        </div>
      </form>

      {/* ── 4. CV ──────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-white px-4 py-5 shadow-sm sm:px-6 sm:py-6">
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

            {subiendoCV ? (
              <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-surface-tinted px-4 py-3">
                <Spinner className="text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="break-all text-sm font-medium text-foreground">{cvFile?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {cvFile ? `${(cvFile.size / 1024).toFixed(0)} KB · PDF` : ""}
                  </p>
                </div>
                <span className="shrink-0 text-sm text-primary">Subiendo CV…</span>
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
                    Hacé clic para seleccionar tu CV. Se sube automáticamente.
                  </p>
                  <p className="mt-1 text-xs text-muted-icon">{CV_HELP_TEXT}</p>
                </div>
              </button>
            )}

            <div aria-live="polite">
              {errorCV && <MensajeError error={errorCV} />}
            </div>
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-4">
            <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface-tinted px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <FileText className="h-8 w-8 shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="break-all text-sm font-medium text-foreground">
                    {postulante.cvActivo.nombreOriginal}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {postulante.cvActivo.tamano > 0
                      ? `${(postulante.cvActivo.tamano / 1024).toFixed(0)} KB · `
                      : ""}
                    PDF · Subido el{" "}
                    {formatFecha(postulante.cvActivo.creadoEn)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {postulante.cvActivo.url && (
                  <a
                    href={subiendoCV ? undefined : postulante.cvActivo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-disabled={subiendoCV}
                    tabIndex={subiendoCV ? -1 : undefined}
                    className={`btn-secundario inline-flex min-h-11 items-center gap-1.5 px-3 text-sm font-medium sm:min-h-9${subiendoCV ? " pointer-events-none opacity-60" : ""}`}
                  >
                    <ExternalLink className="h-4 w-4" />
                    Ver CV
                  </a>
                )}
                <DialogoConfirmacion
                  textoBoton={
                    <>
                      <X className="h-4 w-4" />
                      Eliminar
                    </>
                  }
                  estiloBoton="peligro"
                  claseBoton="px-3 sm:min-h-9"
                  deshabilitado={subiendoCV}
                  titulo="¿Eliminar tu CV?"
                  descripcion="Sin CV no vas a poder postularte a nuevas ofertas hasta que subas otro."
                  textoConfirmar="Sí, eliminar"
                  textoPendiente="Eliminando…"
                  destructivo
                  accion={eliminarCV}
                  onExito={() => router.refresh()}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => cvInputRef.current?.click()}
                disabled={subiendoCV}
                aria-busy={subiendoCV}
                className="btn-secundario inline-flex min-h-11 w-fit items-center gap-1.5 px-4 text-sm font-medium sm:min-h-9"
              >
                {subiendoCV ? <Spinner /> : <Upload className="h-4 w-4" />}
                {subiendoCV ? "Subiendo…" : "Reemplazar CV"}
              </button>
              <p className="text-xs text-muted-icon">{CV_HELP_TEXT}</p>
            </div>

            <div aria-live="polite">
              {errorCV && <MensajeError error={errorCV} />}
            </div>
          </div>
        )}

        <input
          ref={cvInputRef}
          type="file"
          accept={CV_ACCEPT}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleSeleccionarCV(file);
            e.target.value = "";
          }}
        />
      </div>

      {/* ── Modal foto de perfil ───────────────────────────────────────────── */}
      {modalFotoAbierto && usuario.avatarActivo?.url && (
        <FotoPerfilModal
          src={usuario.avatarActivo.url}
          nombre={usuario.nombre}
          ajusteInicial={ajusteActual}
          modoInicial={modalModo}
          onClose={() => setModalFotoAbierto(false)}
          onGuardado={(nuevoAjuste) => {
            setAjusteActual(nuevoAjuste);
            setModalFotoAbierto(false);
          }}
        />
      )}

      {/* ── 5. Contraseña ──────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-white px-4 py-5 shadow-sm sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-foreground">Contraseña</p>
            <p className="text-xs text-muted-foreground">Cambiá tu contraseña de acceso.</p>
          </div>
          {!mostrarFormContrasena && (
            <button
              type="button"
              onClick={() => setMostrarFormContrasena(true)}
              className="btn-secundario inline-flex min-h-11 shrink-0 items-center gap-1.5 px-4 text-sm font-medium sm:min-h-9"
            >
              <KeyRound className="h-4 w-4" />
              Cambiar contraseña
            </button>
          )}
        </div>

        {mostrarFormContrasena && (
          <form onSubmit={handleCambiarContrasena} noValidate className="mt-5 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="p-contrasena-actual" className="text-sm font-medium text-foreground">
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
                  className={inputClassPassword}
                  {...ariaErrorCampo("p-contrasena-actual", camposContrasena.errores.contrasenaActual)}
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
              <ErrorCampo idCampo="p-contrasena-actual" mensaje={camposContrasena.errores.contrasenaActual} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="p-contrasena-nueva" className="text-sm font-medium text-foreground">
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
                  className={inputClassPassword}
                  {...ariaErrorCampo("p-contrasena-nueva", camposContrasena.errores.contrasenaNueva)}
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
              <ErrorCampo idCampo="p-contrasena-nueva" mensaje={camposContrasena.errores.contrasenaNueva} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="p-repetir-contrasena" className="text-sm font-medium text-foreground">
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
                  className={inputClassPassword}
                  {...ariaErrorCampo("p-repetir-contrasena", camposContrasena.errores.repetirContrasena)}
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
              <ErrorCampo idCampo="p-repetir-contrasena" mensaje={camposContrasena.errores.repetirContrasena} />
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="submit"
                disabled={cargandoContrasena}
                aria-busy={cargandoContrasena}
                className="btn-primario min-h-11 justify-center px-6"
              >
                {cargandoContrasena ? <Spinner /> : <CheckCircle2 className="h-4 w-4" />}
                {cargandoContrasena ? "Guardando…" : "Guardar contraseña"}
              </button>
              <button
                type="button"
                onClick={handleCancelarContrasena}
                disabled={cargandoContrasena}
                className="btn-secundario inline-flex min-h-11 items-center justify-center px-6 text-sm font-medium"
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
