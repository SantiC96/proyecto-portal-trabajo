"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Phone,
  MapPin,
  CreditCard,
  Mail,
  CheckCircle2,
  Pencil,
} from "lucide-react";
import { MultiCombobox } from "@/components/ui/multi-combobox";
import { actualizarPerfil, actualizarRubros } from "./actions";
import { SeccionCvs } from "./seccion-cvs";
import { SeccionProcedencia, type ComprobantePerfil } from "./seccion-procedencia";
import type { CvVista } from "@/lib/cvs";
import { LARGO_MAXIMO, validarNombre, validarDNI, validarTelefono } from "@/lib/validaciones";
import type { Rol, Tabla } from "@/types/db";
import { mostrarAviso } from "@/lib/avisos";
import { useAccion } from "@/lib/use-accion";
import { Spinner } from "@/components/ui/spinner";
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
  SectionTitle,
  inputClass,
  inputReadonlyClass,
  type FotoPerfil,
} from "@/components/perfil/piezas";
import { EncabezadoPerfil } from "@/components/perfil/encabezado-perfil";
import { inicialesDePersona } from "@/lib/iniciales";
import { SECCION_PERFIL } from "@/lib/perfil-secciones";
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
    cvs: CvVista[];
  };
  procedencia: {
    localidad: string | null;
    comprobante: ComprobantePerfil | null;
  };
  email: string;
  categorias: Pick<Tabla<"categorias">, "id" | "nombre">[];
  categoriasSeleccionadas: string[];
}

// ─── componente ──────────────────────────────────────────────────────────────

export function PerfilForm({
  usuario,
  postulante,
  procedencia,
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

  // ── render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6">

      {/* ── 1. Encabezado con la foto ──────────────────────────────────────── */}
      <div id={SECCION_PERFIL.foto} className="scroll-mt-20">
        <EncabezadoPerfil
          avatarActivo={usuario.avatarActivo}
          titulo={`${usuario.nombre} ${usuario.apellido}`}
          subtitulo="Postulante"
          iniciales={inicialesDePersona(usuario.nombre, usuario.apellido)}
        />
      </div>

      {/* ── 2. Datos personales ────────────────────────────────────────────── */}
      <form onSubmit={handleGuardarDatos} noValidate>
        <div
          id={SECCION_PERFIL.datos}
          className="scroll-mt-20 rounded-2xl border border-border bg-white px-4 py-5 shadow-sm sm:px-6 sm:py-6"
        >
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
          <div
            id={SECCION_PERFIL.informacionLaboral}
            className="mt-8 scroll-mt-20 border-t border-border pt-6"
          >
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

      {/* ── 3. Procedencia ─────────────────────────────────────────────────── */}
      <SeccionProcedencia
        localidad={procedencia.localidad}
        comprobante={procedencia.comprobante}
      />

      {/* ── 4. Rubros de interés ───────────────────────────────────────────── */}
      <form onSubmit={handleGuardarRubros}>
        <div
          id={SECCION_PERFIL.rubros}
          className="scroll-mt-20 rounded-2xl border border-border bg-white px-4 py-5 shadow-sm sm:px-6 sm:py-6"
        >
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

      {/* ── 5. CV ──────────────────────────────────────────────────────────── */}
      <SeccionCvs cvs={postulante.cvs} />

      {/* ── 6. Contraseña ──────────────────────────────────────────────────── */}
      <SeccionContrasena />

    </div>
  );
}
