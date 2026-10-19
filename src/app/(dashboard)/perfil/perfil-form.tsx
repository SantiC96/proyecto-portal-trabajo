"use client";

import { useState, useRef } from "react";
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
  ExternalLink,
  Pencil,
} from "lucide-react";
import { MultiCombobox } from "@/components/ui/multi-combobox";
import {
  actualizarPerfil,
  actualizarRubros,
  subirCV,
  eliminarCV,
} from "./actions";
import { LARGO_MAXIMO, validarNombre, validarDNI, validarTelefono } from "@/lib/validaciones";
import type { Rol, Tabla } from "@/types/db";
import type { ErrorAccion } from "@/lib/resultado";
import { mostrarAviso } from "@/lib/avisos";
import { useAccion } from "@/lib/use-accion";
import { Spinner } from "@/components/ui/spinner";
import { DialogoConfirmacion } from "@/components/ui/dialogo-confirmacion";
import {
  CV_ACCEPT,
  CV_HELP_TEXT,
  CV_MAX_SIZE,
  ERRORES_ARCHIVO,
  validarTipoCV,
} from "@/lib/archivos";
import {
  CLASE_CONTROL_INVALIDO,
  ErrorCampo,
  Obligatorio,
  ariaErrorCampo,
} from "@/components/ui/obligatorio";
import {
  CampoLectura,
  FieldIcon,
  InputWrapper,
  MensajeError,
  SectionTitle,
  inputClass,
  inputReadonlyClass,
  type FotoPerfil,
} from "@/components/perfil/piezas";
import { EncabezadoPerfil } from "@/components/perfil/encabezado-perfil";
import { inicialesDePersona } from "@/lib/iniciales";
import { SeccionContrasena } from "@/components/perfil/seccion-contrasena";
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

// ─── helpers ─────────────────────────────────────────────────────────────────

const selectClass =
  "min-h-11 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60 " +
  CLASE_CONTROL_INVALIDO;

const textareaClass =
  "min-h-32 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-placeholder outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60 " +
  CLASE_CONTROL_INVALIDO;

// ─── tipos ───────────────────────────────────────────────────────────────────

interface PerfilFormProps {
  usuario: {
    nombre: string;
    apellido: string;
    telefono: string;
    rol: Rol | null;
    avatarActivo: FotoPerfil | null;
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

  // CV
  const cvInputRef = useRef<HTMLInputElement>(null);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const { pendiente: subiendoCV, ejecutar: ejecutarCV } = useAccion();
  // Solo errores de la validación del archivo en el navegador: los del servidor van en el toast.
  const [errorCV, setErrorCV] = useState<ErrorAccion | null>(null);

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

  // ── render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6">

      {/* ── 1. Encabezado con la foto ──────────────────────────────────────── */}
      <EncabezadoPerfil
        avatarActivo={usuario.avatarActivo}
        titulo={`${usuario.nombre} ${usuario.apellido}`}
        subtitulo="Postulante"
        iniciales={inicialesDePersona(usuario.nombre, usuario.apellido)}
      />

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

      {/* ── 5. Contraseña ──────────────────────────────────────────────────── */}
      <SeccionContrasena />

    </div>
  );
}
