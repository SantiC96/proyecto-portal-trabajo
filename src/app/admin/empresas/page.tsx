import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Building2 } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { logError } from "@/lib/logger";
import { formatearCUIT } from "@/lib/cuit";
import { limpiarBusqueda, patronIlike } from "@/lib/busqueda";
import {
  consultarPagina,
  hrefConParams,
  leerPagina,
  type ParamsUrl,
} from "@/lib/paginacion";
import { Badge } from "@/components/ui/badge";
import { Buscador } from "@/components/ui/buscador";
import { PestanasEstado } from "@/components/ui/pestanas-estado";
import { Paginacion } from "@/components/ui/paginacion";
import { EstadoVacio, ErrorListado } from "@/components/ui/estado-listado";
import { EsqueletoLista } from "@/components/ui/esqueleto";
import { EncabezadoPagina } from "@/components/ui/encabezado-pagina";
import {
  CLASE_ACCION_FILA,
  CeldaPersona,
  CeldaTabla,
  FilaTabla,
  Tabla as TablaListado,
} from "@/components/ui/tabla";
import { requerirRolPagina } from "@/lib/auth";
import { idsEmpresasSinConfirmar, listaIn } from "@/lib/admin/empresas-sin-confirmar";
import { ESTADOS_EMPRESA, historialValido, type EstadoAprobacion } from "@/lib/admin/historial-empresa";
import { formatFechaCorta } from "@/lib/fechas";
import { inicialesDeEmpresa } from "@/lib/iniciales";
import { fotosDePerfil } from "@/lib/fotos-perfil";

export const metadata: Metadata = {
  title: "Empresas | Panel municipal | Portal de Empleo Funes",
};

const LABELS: Record<EstadoAprobacion, string> = {
  pendiente: "Pendientes",
  aprobada: "Aprobadas",
  rechazada: "Rechazadas",
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
  const contar = (e: EstadoAprobacion) =>
    supabase
      .from("empresas")
      .select("*", { count: "exact", head: true })
      .eq("estado_aprobacion", e);
  const [
    { count: cPendientesTotales },
    { count: cAprobadas },
    { count: cRechazadas },
    sinConfirmar,
  ] = await Promise.all([
    contar("pendiente"),
    contar("aprobada"),
    contar("rechazada"),
    idsEmpresasSinConfirmar(supabase),
  ]);

  // Las empresas que no confirmaron el email no cuentan como pendientes: la
  // base solo las deja en ese estado (migration_042).
  if (sinConfirmar.error) logError("admin_empresas_contador_sin_confirmar", sinConfirmar.error);
  const cPendientes = Math.max(0, (cPendientesTotales ?? 0) - (sinConfirmar.ids?.length ?? 0));

  const cantidades: Record<EstadoAprobacion, number> = {
    pendiente: cPendientes,
    aprobada: cAprobadas ?? 0,
    rechazada: cRechazadas ?? 0,
  };

  return (
    <section className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Empresas"
        bajada="Aprobá las empresas antes de que puedan publicar ofertas."
      />

      <PestanasEstado
        etiqueta="Estado de las empresas"
        pestanas={ESTADOS_EMPRESA.map((tab) => ({
          href: hrefConParams(RUTA, {}, { estado: tab, q: sp.q ?? null }),
          label: LABELS[tab],
          activa: tab === estado,
          cantidad: cantidades[tab],
        }))}
      />

      <Buscador
        className="min-w-0 lg:max-w-xl"
        inputClassName="rounded-xl"
        placeholder="Buscar por razón social o CUIT…"
      />

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
const COLUMNAS = "minmax(0,2fr) 9.5rem minmax(0,1.2fr) minmax(0,1.4fr) 7.5rem auto";

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
  /** Calculadas en la página, que también las usa para el contador. */
  empresasSinConfirmar: Awaited<ReturnType<typeof idsEmpresasSinConfirmar>>;
}) {
  const supabase = await createSupabaseServerClient();
  const ascendente = estado === "pendiente";

  // Para la oficina, una empresa que no confirmó su email todavía no existe.
  // Solo pueden estar pendientes: la base no deja aprobarlas ni rechazarlas
  // (migration_042).
  let sinConfirmar: string[] = [];
  if (estado === "pendiente") {
    if (empresasSinConfirmar.error) {
      const ref = logError("admin_empresas_sin_confirmar", empresasSinConfirmar.error, { estado });
      return <ErrorListado refError={ref} />;
    }
    sinConfirmar = empresasSinConfirmar.ids;
  }

  const resultado = await consultarPagina(pagina, (desde, hasta) => {
    let query = supabase
      .from("empresas")
      .select(
        "id, razon_social, cuit, rubro, created_at, usuario_id, usuarios(nombre, apellido, telefono)",
        { count: "exact" }
      )
      .eq("estado_aprobacion", estado);

    if (sinConfirmar.length > 0) {
      query = query.not("id", "in", listaIn(sinConfirmar));
    }

    if (q) {
      // El CUIT se guarda como XX-XXXXXXXX-X: además del texto tal cual se
      // busca la versión con guiones de los dígitos ingresados.
      const condiciones = [
        `razon_social.ilike.${patronIlike(q)}`,
        `cuit.ilike.${patronIlike(q)}`,
      ];
      const digitos = q.replace(/\D/g, "");
      if (digitos.length >= 2) {
        condiciones.push(`cuit.ilike.${patronIlike(formatearCUIT(digitos))}`);
      }
      query = query.or(condiciones.join(","));
    }

    return query
      .order("created_at", { ascending: ascendente })
      .order("id", { ascending: ascendente })
      .range(desde, hasta);
  });

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
      <p className="text-sm text-muted-foreground-strong" aria-live="polite">
        Mostrando {empresas.length} de {resultado.total}{" "}
        {resultado.total === 1 ? "empresa" : "empresas"}
      </p>

      <TablaListado
        columnas={COLUMNAS}
        etiqueta="Empresas"
        encabezados={["Razón social", "CUIT", "Rubro", "Persona responsable", "Solicitud", ""]}
      >
        {empresas.map((empresa) => {
          const href = `${RUTA}/${empresa.id}`;
          const logo = logos.get(empresa.usuario_id);
          const reenvio = reenviadas.get(empresa.id);
          const responsable = empresa.usuarios
            ? `${empresa.usuarios.nombre} ${empresa.usuarios.apellido}`
            : "—";
          return (
            <FilaTabla key={empresa.id}>
              <CeldaPersona
                nombre={empresa.razon_social}
                href={href}
                foto={logo ? { url: logo.url, ajuste: logo.ajuste } : undefined}
                iniciales={inicialesDeEmpresa(empresa.razon_social)}
              >
                {reenvio && <Badge tono="warning">Reenviada</Badge>}
              </CeldaPersona>
              <CeldaTabla etiqueta="CUIT" rotuloVisible className="tabular-nums">
                {formatearCUIT(empresa.cuit)}
              </CeldaTabla>
              <CeldaTabla etiqueta="Rubro" rotuloVisible>
                {empresa.rubro}
              </CeldaTabla>
              <CeldaTabla etiqueta="Persona responsable" rotuloVisible>
                {responsable}
              </CeldaTabla>
              <CeldaTabla etiqueta="Solicitud" rotuloVisible className="tabular-nums">
                {formatFechaCorta(reenvio ?? empresa.created_at)}
              </CeldaTabla>
              <Link href={href} className={`btn-neutro ${CLASE_ACCION_FILA}`}>
                Revisar
                <span className="sr-only">: {empresa.razon_social}</span>
              </Link>
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
      />
    </div>
  );
}
