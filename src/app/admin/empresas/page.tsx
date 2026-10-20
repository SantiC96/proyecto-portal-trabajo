import type { Metadata } from "next";
import { Suspense } from "react";
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
import { ContadoresEstado, PestanasEstado } from "@/components/ui/pestanas-estado";
import { Paginacion } from "@/components/ui/paginacion";
import { EstadoVacio, ErrorListado } from "@/components/ui/estado-listado";
import { EsqueletoLista } from "@/components/ui/esqueleto";
import { EmpresaAcciones } from "./acciones";
import type { Tabla } from "@/types/db";
import { requerirRolPagina } from "@/lib/auth";
import { idsEmpresasSinConfirmar, listaIn } from "@/lib/admin/empresas-sin-confirmar";
import { formatFechaCorta } from "@/lib/fechas";
import { BotonVolver } from "@/components/ui/boton-volver";
import { AvatarAjustado } from "@/components/ui/avatar-ajustado";
import { fotosDePerfil } from "@/lib/fotos-perfil";

export const metadata: Metadata = {
  title: "Empresas | Panel municipal | Portal de Empleo Funes",
};

const ESTADOS = ["pendiente", "aprobada", "rechazada"] as const;
type EstadoAprobacion = (typeof ESTADOS)[number];

// historial_aprobacion_empresa.evento es text con un CHECK (migration_031).
const EVENTOS_HISTORIAL = ["aprobada", "rechazada", "reenviada"] as const;

export type HistorialEntry = Pick<
  Tabla<"historial_aprobacion_empresa">,
  "id" | "empresa_id" | "motivo" | "created_at"
> & { evento: (typeof EVENTOS_HISTORIAL)[number] };

function esEventoHistorial(valor: string): valor is HistorialEntry["evento"] {
  return EVENTOS_HISTORIAL.some((e) => e === valor);
}

const LABELS: Record<EstadoAprobacion, string> = {
  pendiente: "Pendientes",
  aprobada: "Aprobadas",
  rechazada: "Rechazadas",
};

const BADGE_VARIANT: Record<EstadoAprobacion, "secondary" | "default" | "destructive"> = {
  pendiente: "secondary",
  aprobada: "default",
  rechazada: "destructive",
};

const RUTA = "/admin/empresas";

export default async function AdminEmpresasPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; q?: string; pagina?: string }>;
}) {
  await requerirRolPagina("municipalidad");
  const sp = await searchParams;
  const estado: EstadoAprobacion = ESTADOS.find((e) => e === sp.estado) ?? "pendiente";
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

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <BotonVolver href="/admin">Volver al panel</BotonVolver>

      <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        Empresas
      </h1>

      <ContadoresEstado
        className="mt-6"
        contadores={[
          { label: "Pendientes", valor: cPendientes, color: "text-amber-700" },
          { label: "Aprobadas", valor: cAprobadas ?? 0, color: "text-emerald-700" },
          { label: "Rechazadas", valor: cRechazadas ?? 0, color: "text-red-600" },
        ]}
      />

      <PestanasEstado
        className="mt-6"
        etiqueta="Estado de las empresas"
        pestanas={ESTADOS.map((tab) => ({
          href: hrefConParams(RUTA, {}, { estado: tab, q: sp.q ?? null }),
          label: LABELS[tab],
          activa: tab === estado,
        }))}
      />

      {/* Búsqueda */}
      <Buscador className="mt-4" placeholder="Buscar por razón social o CUIT…" />

      <Suspense
        key={JSON.stringify({ estado, q, pagina })}
        fallback={<EsqueletoLista filas={5} className="mt-4" />}
      >
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
      return <ErrorListado className="mt-4" refError={ref} />;
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
    return <ErrorListado className="mt-4" refError={ref} />;
  }

  const empresas = resultado.filas;

  if (empresas.length === 0) {
    return q ? (
      <EstadoVacio
        tipo="sin-resultados"
        className="mt-4"
        titulo="No se encontraron empresas con esa búsqueda"
        hrefLimpiar={hrefConParams(RUTA, {}, { estado })}
        textoLimpiar="Limpiar búsqueda"
      />
    ) : (
      <EstadoVacio
        tipo="sin-registros"
        className="mt-4"
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

  // Consultas paralelas: emails, logos e historial de las empresas de la página actual.
  const [{ data: emailRows }, logos, { data: historialRows }] = await Promise.all([
    usuarioIds.length > 0
      ? supabase.rpc("emails_de_usuarios", { ids: usuarioIds })
      : Promise.resolve({ data: [] }),
    fotosDePerfil(usuarioIds),
    empresaIds.length > 0
      ? supabase
          .from("historial_aprobacion_empresa")
          .select("id, empresa_id, evento, motivo, created_at")
          .in("empresa_id", empresaIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);

  const emailMap = new Map<string, string>(
    (emailRows ?? []).map((r) => [r.id, r.email])
  );

  // Descarta eventos desconocidos (el CHECK de la base no los permite).
  const historial: HistorialEntry[] = (historialRows ?? []).flatMap((entry) => {
    const { evento } = entry;
    return esEventoHistorial(evento) ? [{ ...entry, evento }] : [];
  });

  // Agrupar historial por empresa (ya viene ordenado DESC por created_at).
  const historialPorEmpresa = new Map<string, HistorialEntry[]>();
  for (const entry of historial) {
    const list = historialPorEmpresa.get(entry.empresa_id) ?? [];
    list.push(entry);
    historialPorEmpresa.set(entry.empresa_id, list);
  }

  // Para la pestaña pendiente: fecha del último reenvío de cada empresa.
  const reenviadas = new Map<string, string>();
  if (estado === "pendiente") {
    for (const entry of historial) {
      if (entry.evento === "reenviada" && !reenviadas.has(entry.empresa_id)) {
        reenviadas.set(entry.empresa_id, entry.created_at);
      }
    }
  }

  return (
    <>
          {/* Vista desktop: tabla */}
          <div className="mt-4 hidden overflow-x-auto md:block">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="py-3 pr-4 font-medium text-muted-foreground">
                    Razón social
                  </th>
                  <th className="py-3 pr-4 font-medium text-muted-foreground">
                    CUIT
                  </th>
                  <th className="py-3 pr-4 font-medium text-muted-foreground">
                    Rubro
                  </th>
                  <th className="py-3 pr-4 font-medium text-muted-foreground">
                    Responsable
                  </th>
                  <th className="py-3 pr-4 font-medium text-muted-foreground">
                    Teléfono
                  </th>
                  <th className="py-3 pr-4 font-medium text-muted-foreground">
                    Email
                  </th>
                  <th className="py-3 pr-4 font-medium text-muted-foreground">
                    Registro
                  </th>
                  <th className="py-3 font-medium text-muted-foreground">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {empresas.map((empresa) => (
                  <tr
                    key={empresa.id}
                    className="border-b border-border last:border-0"
                  >
                    <td className="py-4 pr-4 font-medium text-foreground">
                      <div className="flex items-center gap-2.5">
                        <AvatarAjustado
                          src={logos.get(empresa.usuario_id)?.url}
                          ajuste={logos.get(empresa.usuario_id)?.ajuste}
                          alt={`Logo de ${empresa.razon_social}`}
                          size="sm"
                        />
                        {empresa.razon_social}
                      </div>
                    </td>
                    <td className="py-4 pr-4 font-mono text-muted-foreground">
                      {formatearCUIT(empresa.cuit)}
                    </td>
                    <td className="py-4 pr-4 text-muted-foreground">
                      {empresa.rubro}
                    </td>
                    <td className="py-4 pr-4 text-foreground">
                      {empresa.usuarios
                        ? `${empresa.usuarios.nombre} ${empresa.usuarios.apellido}`
                        : "—"}
                    </td>
                    <td className="py-4 pr-4 text-muted-foreground">
                      {empresa.usuarios?.telefono ?? "—"}
                    </td>
                    <td className="py-4 pr-4 text-muted-foreground">
                      {emailMap.get(empresa.usuario_id) || "—"}
                    </td>
                    <td className="py-4 pr-4 text-muted-foreground">
                      {formatFechaCorta(empresa.created_at)}
                    </td>
                    <td className="py-4">
                      <EmpresaAcciones
                        empresaId={empresa.id}
                        razonSocial={empresa.razon_social}
                        estadoActual={estado}
                        historial={historialPorEmpresa.get(empresa.id) ?? []}
                        fechaReenvio={reenviadas.get(empresa.id)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Vista mobile: tarjetas */}
          <div className="mt-4 space-y-3 md:hidden">
            {empresas.map((empresa) => (
              <div
                key={empresa.id}
                className="rounded-[var(--radius-lg)] border border-border bg-surface p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <AvatarAjustado
                      src={logos.get(empresa.usuario_id)?.url}
                      ajuste={logos.get(empresa.usuario_id)?.ajuste}
                      alt={`Logo de ${empresa.razon_social}`}
                      size="sm"
                    />
                    <p className="font-semibold text-foreground">
                      {empresa.razon_social}
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-1">
                    <Badge variant={BADGE_VARIANT[estado]}>{LABELS[estado]}</Badge>
                    {estado === "pendiente" && reenviadas.has(empresa.id) && (
                      <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-amber-200">
                        Reenviada
                      </Badge>
                    )}
                  </div>
                </div>
                <dl className="mt-3 space-y-1.5 text-sm">
                  <div className="flex gap-2">
                    <dt className="w-24 flex-shrink-0 text-muted-foreground">
                      CUIT
                    </dt>
                    <dd className="font-mono text-foreground">
                      {formatearCUIT(empresa.cuit)}
                    </dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-24 flex-shrink-0 text-muted-foreground">
                      Rubro
                    </dt>
                    <dd className="text-foreground">{empresa.rubro}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-24 flex-shrink-0 text-muted-foreground">
                      Responsable
                    </dt>
                    <dd className="text-foreground">
                      {empresa.usuarios
                        ? `${empresa.usuarios.nombre} ${empresa.usuarios.apellido}`
                        : "—"}
                    </dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-24 flex-shrink-0 text-muted-foreground">
                      Teléfono
                    </dt>
                    <dd className="text-foreground">
                      {empresa.usuarios?.telefono ?? "—"}
                    </dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-24 flex-shrink-0 text-muted-foreground">
                      Email
                    </dt>
                    <dd className="break-all text-foreground">
                      {emailMap.get(empresa.usuario_id) || "—"}
                    </dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-24 flex-shrink-0 text-muted-foreground">
                      Registro
                    </dt>
                    <dd className="text-foreground">
                      {formatFechaCorta(empresa.created_at)}
                    </dd>
                  </div>
                </dl>
                <div className="mt-4">
                  <EmpresaAcciones
                    empresaId={empresa.id}
                    razonSocial={empresa.razon_social}
                    estadoActual={estado}
                    historial={historialPorEmpresa.get(empresa.id) ?? []}
                    fechaReenvio={reenviadas.get(empresa.id)}
                  />
                </div>
              </div>
            ))}
          </div>
          <Paginacion
            className="mt-6"
            ruta={RUTA}
            searchParams={searchParams}
            pagina={resultado.pagina}
            total={resultado.total}
          />
    </>
  );
}
