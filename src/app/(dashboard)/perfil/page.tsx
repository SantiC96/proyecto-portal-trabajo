import type { Metadata } from "next";
import { Suspense } from "react";
import { MapPin } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requerirRolPagina } from "@/lib/auth";
import { PerfilForm } from "./perfil-form";
import { AvisoCursoPendiente } from "@/components/cursos/aviso-curso-pendiente";
import { BotonVolver } from "@/components/ui/boton-volver";
import { consultaCvsDisponibles, conUrlsFirmadas } from "@/lib/cvs";
import { obtenerComprobanteVigente } from "@/lib/comprobantes";
import { Aviso } from "@/components/ui/aviso";
import { EncabezadoPagina } from "@/components/ui/encabezado-pagina";
import { IndiceSecciones, type EstadoSeccion } from "@/components/perfil/indice-secciones";
import { SECCION_PERFIL, type SeccionPerfil } from "@/lib/perfil-secciones";
import { AnilloProgreso } from "@/components/ui/anillo-progreso";
import { obtenerCompletitudPerfil, type CompletitudPerfil } from "@/lib/postulante/panel";
import { logError } from "@/lib/logger";

const TITULO = "Mi perfil";
const BAJADA = "Mantené tus datos al día: la Oficina de Empleo los usa para proponerte ofertas.";

// Mismo orden que las tarjetas de PerfilForm.
const SECCIONES: { id: SeccionPerfil; titulo: string }[] = [
  { id: SECCION_PERFIL.foto, titulo: "Foto" },
  { id: SECCION_PERFIL.datos, titulo: "Datos personales" },
  { id: SECCION_PERFIL.procedencia, titulo: "Procedencia" },
  { id: SECCION_PERFIL.informacionLaboral, titulo: "Información laboral" },
  { id: SECCION_PERFIL.rubros, titulo: "Rubros de interés" },
  { id: SECCION_PERFIL.cvs, titulo: "CVs" },
  { id: SECCION_PERFIL.contrasena, titulo: "Contraseña" },
];

export const metadata: Metadata = {
  title: "Mi perfil | Portal de Empleo Funes",
};

export default async function PerfilPage() {
  // Verify role FIRST — before querying any role-specific table.
  // Next preloads navbar links, so /perfil executes for empresa/municipalidad users too.
  // Querying postulantes before this check would generate spurious error logs.
  const user = await requerirRolPagina("postulante");
  const usuario = user.perfil;

  const supabase = await createSupabaseServerClient();

  // Only postulantes reach here — run remaining queries in parallel
  const [
    postulanteResult,
    categoriasResult,
    cvsResult,
    avatarActivoResult,
    comprobante,
    completitud,
  ] = await Promise.all([
    supabase
      .from("postulantes")
      .select(
        "id, dni, domicilio, localidad, nivel_educativo, situacion_laboral, disponibilidad, experiencia_laboral, postulante_categorias(categoria_id)"
      )
      .eq("usuario_id", user.id)
      .maybeSingle(),
    supabase.from("categorias").select("id, nombre").order("nombre"),
    consultaCvsDisponibles(supabase, user.id),
    supabase
      .from("archivos_usuario")
      .select("ruta, nombre_original, ajuste_x, ajuste_y, ajuste_zoom")
      .eq("usuario_id", user.id)
      .eq("tipo", "avatar")
      .eq("activo", true)
      .maybeSingle(),
    obtenerComprobanteVigente(supabase, user.id, 300),
    obtenerCompletitudPerfil(),
  ]);

  const postulante = postulanteResult.data;
  const categorias = categoriasResult.data ?? [];

  if (!postulante) {
    return (
      <section className="flex w-full flex-col gap-6">
        <EncabezadoPagina banda titulo={TITULO} />
        <Aviso tono="danger" titulo="No pudimos cargar tu perfil">
          Intentá de nuevo más tarde. Si el problema persiste, comunicate con la oficina de empleo.
        </Aviso>
      </section>
    );
  }

  const categoriasSeleccionadas =
    postulante.postulante_categorias?.map((r) => r.categoria_id) ?? [];

  let avatarUrl: string | null = null;
  if (avatarActivoResult.data?.ruta) {
    const { data: signed } = await supabase.storage
      .from("avatares")
      .createSignedUrl(avatarActivoResult.data.ruta, 3600);
    avatarUrl = signed?.signedUrl ?? null;
  }

  const cvs = await conUrlsFirmadas(supabase, cvsResult.data ?? [], 300);

  const avatarActivo = avatarActivoResult.data
    ? {
        ruta: avatarActivoResult.data.ruta,
        url: avatarUrl,
        ajuste: {
          x: Number(avatarActivoResult.data.ajuste_x ?? 50),
          y: Number(avatarActivoResult.data.ajuste_y ?? 50),
          zoom: Number(avatarActivoResult.data.ajuste_zoom ?? 1),
        },
      }
    : null;

  // Sin la completitud (si falla la lectura), el índice va sin estados y la
  // tarjeta de la foto sin el anillo: el resto del perfil se muestra igual.
  const perfil = completitud.data;
  if (!perfil) logError("perfil_completitud", completitud.error);
  const estados = perfil ? estadosPorSeccion(perfil) : null;
  const secciones = SECCIONES.map((s) => ({ ...s, estado: estados?.get(s.id) }));

  return (
    <section className="@container flex flex-col gap-6">
      <BotonVolver href="/" destacado />
      <EncabezadoPagina banda className="-mt-2" titulo={TITULO} bajada={BAJADA} />

      <div className="grid grid-cols-1 items-start gap-4 @3xl:grid-cols-[240px_minmax(0,1fr)] @3xl:gap-8">
        {/* Pantallas anchas: tarjeta fija a la izquierda. En angostas: pastillas fijas arriba. */}
        <aside className="sticky top-0 z-20 -mx-4 bg-background/95 px-4 py-2 backdrop-blur-sm sm:-mx-6 sm:px-6 @3xl:top-6 @3xl:mx-0 @3xl:bg-transparent @3xl:p-0 @3xl:backdrop-blur-none">
          <IndiceSecciones secciones={secciones} />
        </aside>

        <div className="flex min-w-0 flex-col gap-6">
          <Suspense fallback={null}>
            <AvisoCursoPendiente />
          </Suspense>
          {/* Postulantes registrados antes de migration_055: no bloquea nada. */}
          {!postulante.localidad && (
            <Aviso tono="warning" icono={MapPin}>
              Contanos de dónde sos: completá tu localidad en{" "}
              <a href="#procedencia">Procedencia</a>. La Oficina de Empleo la usa para organizar las
              postulaciones.
            </Aviso>
          )}
          <PerfilForm
            usuario={{
              nombre: usuario.nombre ?? "",
              apellido: usuario.apellido ?? "",
              telefono: usuario.telefono ?? "",
              rol: usuario.rol ?? null,
              avatarActivo,
            }}
            postulante={{
              id: postulante.id ?? "",
              dni: postulante.dni ?? "",
              domicilio: postulante.domicilio ?? "",
              nivelEducativo: postulante.nivel_educativo ?? "",
              situacionLaboral: postulante.situacion_laboral ?? "",
              disponibilidad: postulante.disponibilidad ?? "",
              experienciaLaboral: postulante.experiencia_laboral ?? "",
              cvs,
            }}
            procedencia={{
              localidad: postulante.localidad,
              comprobante: comprobante
                ? {
                    nombreOriginal: comprobante.nombreOriginal,
                    subidoEn: comprobante.subidoEn,
                    tamano: comprobante.tamano,
                    estado: comprobante.estado,
                    motivo: comprobante.motivo,
                    url: comprobante.url,
                  }
                : null,
            }}
            email={user.email ?? ""}
            categorias={categorias}
            categoriasSeleccionadas={categoriasSeleccionadas}
            resumenPerfil={perfil && <ResumenPerfil perfil={perfil} />}
          />
        </div>
      </div>
    </section>
  );
}

// Ítems de la completitud (los mismos del panel) que van en cada sección.
const SECCION_DE_ITEM: Record<string, SeccionPerfil> = {
  datos: SECCION_PERFIL.datos,
  foto: SECCION_PERFIL.foto,
  experiencia: SECCION_PERFIL.informacionLaboral,
  disponibilidad: SECCION_PERFIL.informacionLaboral,
  procedencia: SECCION_PERFIL.procedencia,
  intereses: SECCION_PERFIL.rubros,
  cv: SECCION_PERFIL.cvs,
};

/** Una sección está completa si lo están todos sus ítems. Contraseña no tiene ítems. */
function estadosPorSeccion(perfil: CompletitudPerfil): Map<SeccionPerfil, EstadoSeccion> {
  const estados = new Map<SeccionPerfil, EstadoSeccion>();
  for (const item of perfil.items) {
    const seccion = SECCION_DE_ITEM[item.clave];
    if (!seccion) continue;
    if (!item.completo) estados.set(seccion, "incompleta");
    else if (!estados.has(seccion)) estados.set(seccion, "completa");
  }
  return estados;
}

/** Recuadro de la tarjeta de la foto: el anillo del panel y lo que falta. */
function ResumenPerfil({ perfil }: { perfil: CompletitudPerfil }) {
  return (
    <div className="flex items-start gap-4 rounded-[var(--radius-lg)] bg-primary/6 p-4 lg:max-w-sm lg:shrink-0">
      <AnilloProgreso
        tamano={64}
        porcentaje={perfil.porcentaje}
        etiqueta={`Perfil completo al ${perfil.porcentaje}%`}
      />
      <div className="min-w-0">
        <p className="text-base font-extrabold text-heading">Perfil al {perfil.porcentaje} %</p>
        {perfil.pendientes.length === 0 ? (
          <p className="mt-1 text-sm text-muted-foreground-strong">Tu perfil está completo.</p>
        ) : (
          <>
            <p className="mt-1 text-sm text-muted-foreground-strong">Te falta:</p>
            <ul className="mt-0.5 flex flex-col">
              {perfil.pendientes.map((item) => (
                <li key={item.clave}>
                  <a
                    href={`#${SECCION_DE_ITEM[item.clave] ?? ""}`}
                    className="inline-flex min-h-11 items-center rounded-[var(--radius-sm)] text-sm leading-snug font-bold text-primary underline-offset-2 outline-none hover:underline focus-visible:shadow-[var(--sombra-foco)] sm:min-h-8"
                  >
                    {item.texto}
                  </a>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
