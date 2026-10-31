import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Building2, Calendar, Tag, User } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { logError } from "@/lib/logger";
import { formatearCUIT } from "@/lib/cuit";
import { limpiarBusqueda } from "@/lib/busqueda";
import {
  consultarPagina,
  hrefConParams,
  leerPagina,
  type ParamsUrl,
} from "@/lib/paginacion";
import { Badge } from "@/components/ui/badge";
import { Buscador } from "@/components/ui/buscador";
import { PastillaFiltro } from "@/components/ui/pastilla-filtro";
import { Paginacion } from "@/components/ui/paginacion";
import { EstadoVacio, ErrorListado } from "@/components/ui/estado-listado";
import { EsqueletoLista } from "@/components/ui/esqueleto";
import { EncabezadoPagina } from "@/components/ui/encabezado-pagina";
import {
  CLASE_ACCION_FILA,
  CeldaPersona,
  FilaTabla,
  Tabla as TablaListado,
} from "@/components/ui/tabla";
import { requerirRolPagina } from "@/lib/auth";
import { idsEmpresasSinConfirmar } from "@/lib/admin/empresas-sin-confirmar";
import { aplicarFiltroEmpresas } from "@/lib/admin/filtro-empresas";
import { ESTADOS_EMPRESA, historialValido, type EstadoAprobacion } from "@/lib/admin/historial-empresa";
import { formatFechaCorta } from "@/lib/fechas";
import { inicialesDeEmpresa } from "@/lib/iniciales";
import { fotosDePerfil } from "@/lib/fotos-perfil";
import { BotonVolver } from "@/components/ui/boton-volver";

export const metadata: Metadata = {
  title: "Empresas | Panel municipal | Portal de Empleo Funes",
};

const LABELS: Record<EstadoAprobacion, string> = {
  pendiente: "Pendientes",
  aprobada: "Aprobadas",
  rechazada: "Rechazadas",
};

// Filete izquierdo de la fila: el color del estado.
const FILETE: Record<EstadoAprobacion, string> = {
  pendiente: "before:bg-accent",
  aprobada: "before:bg-primary",
  rechazada: "before:bg-danger",
};

const RUTA = "/admin/empresas";

export default async function AdminEmpresasPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; q?: string; pagina?: string }>;
}) {
  await requerirRolPagina("municipalidad");
  const sp = await searchParams;
  const estado: EstadoAprobacion = ESTADOS_EMPRESA.find((e) => e === sp.estado) ?? "pendiente";
  const q = limpiarBusqueda(sp.q);
  const pagina = leerPagina(sp.pagina);

  const supabase = await createSupabaseServerClient();
  const sinConfirmar = await idsEmpresasSinConfirmar(supabase);
  if (sinConfirmar.error) logError("admin_empresas_contador_sin_confirmar", sinConfirmar.error);

  // Mismo filtro y misma búsqueda para las cantidades y la lista. Las empresas
  // que no confirmaron el email no cuentan como pendientes (migration_042).
  const conteos = await Promise.all(
    ESTADOS_EMPRESA.map((e) =>
      aplicarFiltroEmpresas(
        supabase.from("empresas").select("*", { count: "exact", head: true }),
        e,
        q,
        sinConfirmar.ids ?? [],
      ),
    ),
  );
  const cantidades = Object.fromEntries(
    ESTADOS_EMPRESA.map((e, i) => [e, conteos[i].count ?? 0]),
  ) as Record<EstadoAprobacion, number>;

  return (
    <section className="flex flex-col gap-6">
      <BotonVolver href="/admin" destacado />
      <EncabezadoPagina
        banda
        className="-mt-2"
        botonesBlancos
        titulo="Empresas"
        bajada="Aprobá las empresas antes de que puedan publicar ofertas."
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
        <nav aria-label="Estado de las empresas" className="min-w-0">
          <div className="sin-barra-scroll -mx-4 -my-1 flex gap-2 overflow-x-auto px-4 py-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
            {ESTADOS_EMPRESA.map((tab) => (
              <PastillaFiltro
                key={tab}
                href={hrefConParams(RUTA, {}, { estado: tab, q: sp.q ?? null })}
                activa={tab === estado}
                cantidad={cantidades[tab]}
              >
                {LABELS[tab]}
              </PastillaFiltro>
            ))}
          </div>
        </nav>

        <Buscador
          className="w-full min-w-0 lg:w-[25rem] lg:shrink-0"
          inputClassName="rounded-xl"
          placeholder="Buscar por razón social o CUIT…"
        />
      </div>

      <Suspense key={JSON.stringify({ estado, q, pagina })} fallback={<EsqueletoLista filas={5} />}>
        <ListadoEmpresas
          estado={estado}
          q={q}
          pagina={pagina}
          searchParams={sp}
          empresasSinConfirmar={sinConfirmar}
        />
      </Suspense>
    </section>
  );
}

// Razón social | CUIT | Rubro | Persona responsable | Solicitud | acción.
const COLUMNAS =
  "minmax(0,1.6fr) minmax(max-content,1fr) minmax(0,1.2fr) minmax(0,1.2fr) minmax(max-content,.8fr) minmax(max-content,.6fr)";

// Rubro, responsable y fecha: en la tarjeta del celular, cada uno con su ícono.
const CLASE_DATO =
  "flex min-w-0 items-center gap-2 text-sm break-words text-muted-foreground-strong @4xl:block @4xl:text-[15px] @4xl:text-foreground";
const CLASE_ICONO_DATO = "size-4 shrink-0 text-muted-icon @4xl:hidden";

async function ListadoEmpresas({
  estado,
  q,
  pagina,
  searchParams,
  empresasSinConfirmar,
}: {
  estado: EstadoAprobacion;
  q: string;
  pagina: number;
  searchParams: ParamsUrl;
  /** Calculadas en la página, que también las usa para las cantidades. */
  empresasSinConfirmar: Awaited<ReturnType<typeof idsEmpresasSinConfirmar>>;
}) {
  const supabase = await createSupabaseServerClient();
  const ascendente = estado === "pendiente";

  // Para la oficina, una empresa que no confirmó su email todavía no existe:
  // sin esa lista no se puede armar la pestaña de pendientes.
  if (estado === "pendiente" && empresasSinConfirmar.error) {
    const ref = logError("admin_empresas_sin_confirmar", empresasSinConfirmar.error, { estado });
    return <ErrorListado refError={ref} />;
  }

  const resultado = await consultarPagina(pagina, (desde, hasta) =>
    aplicarFiltroEmpresas(
      supabase
        .from("empresas")
        .select(
          "id, razon_social, cuit, rubro, created_at, usuario_id, usuarios(nombre, apellido, telefono)",
          { count: "exact" },
        ),
      estado,
      q,
      empresasSinConfirmar.ids ?? [],
    )
      .order("created_at", { ascending: ascendente })
      .order("id", { ascending: ascendente })
      .range(desde, hasta),
  );

  if (!resultado.ok) {
    const ref = logError("admin_empresas_listado", resultado.error, { estado });
    return <ErrorListado refError={ref} />;
  }

  const empresas = resultado.filas;

  if (empresas.length === 0) {
    return q ? (
      <EstadoVacio
        tipo="sin-resultados"
        titulo="No se encontraron empresas con esa búsqueda"
        hrefLimpiar={hrefConParams(RUTA, {}, { estado })}
        textoLimpiar="Limpiar búsqueda"
      />
    ) : (
      <EstadoVacio
        tipo="sin-registros"
        icono={Building2}
        titulo={`No hay empresas ${
          estado === "pendiente"
            ? "pendientes de revisión"
            : estado === "aprobada"
              ? "aprobadas"
              : "rechazadas"
        } en este momento.`}
      />
    );
  }

  const empresaIds = empresas.map((e) => e.id);
  const usuarioIds = empresas.map((e) => e.usuario_id);

  // Logos e historial de las empresas de la página actual.
  const [logos, { data: historialRows }] = await Promise.all([
    fotosDePerfil(usuarioIds),
    estado === "pendiente"
      ? supabase
          .from("historial_aprobacion_empresa")
          .select("id, empresa_id, evento, created_at")
          .in("empresa_id", empresaIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);

  // Pestaña pendiente: fecha del último reenvío de cada empresa (el
  // historial viene de más nuevo a más viejo).
  const reenviadas = new Map<string, string>();
  for (const entry of historialValido(historialRows ?? [])) {
    if (entry.evento === "reenviada" && !reenviadas.has(entry.empresa_id)) {
      reenviadas.set(entry.empresa_id, entry.created_at);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <TablaListado
        columnas={COLUMNAS}
        etiqueta="Empresas"
        semantica="tabla"
        encabezados={[
          "Razón social",
          "CUIT",
          "Rubro",
          "Persona responsable",
          "Solicitud",
          <span key="a" className="sr-only">
            Acciones
          </span>,
        ]}
      >
        {empresas.map((empresa) => {
          const href = `${RUTA}/${empresa.id}`;
          const logo = logos.get(empresa.usuario_id);
          const reenvio = reenviadas.get(empresa.id);
          const cuit = formatearCUIT(empresa.cuit);
          const responsable = empresa.usuarios
            ? `${empresa.usuarios.nombre} ${empresa.usuarios.apellido}`
            : "—";
          return (
            <FilaTabla key={empresa.id} semantica="tabla" filete={FILETE[estado]}>
              <div role="cell" className="min-w-0">
                <CeldaPersona
                  nombre={empresa.razon_social}
                  href={href}
                  foto={logo ? { url: logo.url, ajuste: logo.ajuste } : undefined}
                  iniciales={inicialesDeEmpresa(empresa.razon_social)}
                  secundario={`CUIT ${cuit}`}
                  secundarioSoloTarjeta
                >
                  {reenvio && <Badge tono="warning">Reenviada</Badge>}
                </CeldaPersona>
              </div>
              <div role="cell" className="hidden whitespace-nowrap tabular-nums @4xl:block">
                {cuit}
              </div>
              <div role="cell" className={CLASE_DATO}>
                <Tag aria-hidden="true" className={CLASE_ICONO_DATO} />
                <span className="min-w-0">{empresa.rubro}</span>
              </div>
              <div role="cell" className={CLASE_DATO}>
                <User aria-hidden="true" className={CLASE_ICONO_DATO} />
                <span className="min-w-0">{responsable}</span>
              </div>
              <div role="cell" className={`${CLASE_DATO} whitespace-nowrap tabular-nums`}>
                <Calendar aria-hidden="true" className={CLASE_ICONO_DATO} />
                <span>
                  <span className="@4xl:sr-only">Solicitud: </span>
                  {formatFechaCorta(reenvio ?? empresa.created_at)}
                </span>
              </div>
              <div role="cell" className="@4xl:text-right">
                <Link
                  href={href}
                  aria-label={`Revisar ${empresa.razon_social}`}
                  className={`btn-secundario ${CLASE_ACCION_FILA}`}
                >
                  Revisar
                </Link>
              </div>
            </FilaTabla>
          );
        })}
      </TablaListado>

      <Paginacion
        className="mt-2"
        ruta={RUTA}
        searchParams={searchParams}
        pagina={resultado.pagina}
        total={resultado.total}
        variante="numeros"
        elemento={{ singular: "empresa", plural: "empresas" }}
      />
    </div>
  );
}
