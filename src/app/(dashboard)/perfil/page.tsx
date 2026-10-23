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
import { IndiceSecciones } from "@/components/perfil/indice-secciones";
import { SECCION_PERFIL } from "@/lib/perfil-secciones";

const TITULO = "Mi perfil";
const BAJADA = "Mantené tus datos al día: la Oficina de Empleo los usa para proponerte ofertas.";

// Mismo orden que las tarjetas de PerfilForm.
const SECCIONES = [
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
  ]);

  const postulante = postulanteResult.data;
  const categorias = categoriasResult.data ?? [];

  if (!postulante) {
    return (
      <section className="contenido-lectura-ancho flex flex-col gap-6">
        <EncabezadoPagina titulo={TITULO} />
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

  return (
    <section className="@container flex flex-col gap-6">
      <BotonVolver href="/" destacado />
      <EncabezadoPagina className="-mt-2" titulo={TITULO} bajada={BAJADA} />

      <div className="grid grid-cols-1 items-start gap-8 @3xl:grid-cols-[220px_minmax(0,760px)]">
        <aside className="sticky top-6 hidden @3xl:block">
          <IndiceSecciones secciones={SECCIONES} />
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
          />
        </div>
      </div>
    </section>
  );
}
