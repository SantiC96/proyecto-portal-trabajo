import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Briefcase } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { logError } from "@/lib/logger";
import { consultarPagina, leerPagina, type ParamsUrl } from "@/lib/paginacion";
import { Paginacion } from "@/components/ui/paginacion";
import { EstadoVacio, ErrorListado } from "@/components/ui/estado-listado";
import { EsqueletoLista } from "@/components/ui/esqueleto";
import { MisPostulacionesLista } from "./mis-postulaciones-lista";

export const metadata: Metadata = {
  title: "Mis postulaciones | Portal de Empleo Funes",
};

type DbPostulacion = {
  id: string;
  estado: "recibida" | "en_revision" | "derivada" | "rechazada_municipalidad";
  created_at: string;
  ofertas: {
    id: string;
    titulo: string;
    empresa_nombre: string;
    estado: string;
    contenido_editado_en: string | null;
  } | null;
};

const RUTA = "/mis-postulaciones";

export default async function MisPostulacionesPage({
  searchParams,
}: {
  searchParams: Promise<{ pagina?: string }>;
}) {
  const sp = await searchParams;
  const pagina = leerPagina(sp.pagina);
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id", user.id)
    .single();

  if (!usuario || usuario.rol !== "postulante") {
    if (usuario?.rol === "empresa") redirect("/empresa");
    if (usuario?.rol === "municipalidad") redirect("/admin");
    redirect("/");
  }

  const { data: postulante } = await supabase
    .from("postulantes")
    .select("id")
    .eq("usuario_id", user.id)
    .maybeSingle();

  if (!postulante) redirect("/");

  return (
    <main className="flex-1 px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-3xl space-y-10">
        {/* Postulaciones */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Mis postulaciones
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Seguí el estado de cada postulación que enviaste.
          </p>

          <Suspense
            key={pagina}
            fallback={<EsqueletoLista filas={3} className="mt-6" />}
          >
            <ListadoMisPostulaciones
              postulanteId={postulante.id}
              pagina={pagina}
              searchParams={sp}
            />
          </Suspense>
        </div>

      </div>
    </main>
  );
}

async function ListadoMisPostulaciones({
  postulanteId,
  pagina,
  searchParams,
}: {
  postulanteId: string;
  pagina: number;
  searchParams: ParamsUrl;
}) {
  const supabase = await createSupabaseServerClient();

  // LEFT JOIN a ofertas: las ofertas cerradas no son visibles al postulante vía RLS
  // (no se puede agregar política porque migration_014 las reserva).
  // La UI muestra "Oferta no disponible" cuando oferta es null.
  const resultado = await consultarPagina<DbPostulacion>(pagina, (desde, hasta) =>
    supabase
      .from("postulaciones")
      .select(
        "id, estado, created_at, ofertas(id, titulo, empresa_nombre, estado, contenido_editado_en)",
        { count: "exact" }
      )
      .eq("postulante_id", postulanteId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(desde, hasta)
      .overrideTypes<DbPostulacion[], { merge: false }>()
  );

  if (!resultado.ok) {
    const ref = logError("mis_postulaciones_listado", resultado.error);
    return (
      <ErrorListado
        className="mt-6"
        mensaje="No pudimos cargar tus postulaciones. Intentá de nuevo en unos minutos."
        refError={ref}
      />
    );
  }

  const rawList = resultado.filas;

  if (rawList.length === 0) {
    return (
      <EstadoVacio
        tipo="sin-registros"
        className="mt-6"
        icono={Briefcase}
        titulo="Todavía no te postulaste a ninguna oferta"
        descripcion="Explorá las búsquedas activas y encontrá tu próximo trabajo."
        accion={
          <Link
            href="/ofertas"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white shadow-xs transition hover:bg-primary-hover"
          >
            Ver ofertas laborales
          </Link>
        }
      />
    );
  }

  // For derivada postulaciones, get the derivation state (without notes — uses SECURITY DEFINER)
  const derivadasIds = rawList
    .filter((r) => r.estado === "derivada")
    .map((r) => r.id);

  type EstadoDerivacionRow = {
    estado_empresa: string;
    fecha_entrevista: string | null;
    lugar_entrevista: string | null;
  };

  const derivacionEstados: Record<string, EstadoDerivacionRow> = {};
  if (derivadasIds.length > 0) {
    const results = await Promise.all(
      derivadasIds.map((pid) =>
        supabase.rpc("estado_derivacion_postulante", { p_postulacion_id: pid })
      )
    );
    derivadasIds.forEach((pid, i) => {
      const row = (results[i].data as EstadoDerivacionRow[] | null)?.[0];
      if (row) derivacionEstados[pid] = row;
    });
  }

  const postulaciones = rawList.map((r) => ({
    id: r.id,
    estado: r.estado,
    created_at: r.created_at,
    oferta: r.ofertas,
    derivacion: derivacionEstados[r.id] ?? null,
  }));

  return (
    <div className="mt-6 space-y-6">
      <MisPostulacionesLista postulaciones={postulaciones} />
      <Paginacion
        ruta={RUTA}
        searchParams={searchParams}
        pagina={resultado.pagina}
        total={resultado.total}
      />
    </div>
  );
}
