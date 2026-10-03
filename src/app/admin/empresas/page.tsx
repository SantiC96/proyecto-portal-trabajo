import type { Metadata } from "next";
import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { formatearCUIT } from "@/lib/cuit";
import { Badge } from "@/components/ui/badge";
import { EmpresaAcciones } from "./acciones";

export const metadata: Metadata = {
  title: "Empresas | Panel municipal | Portal de Empleo Funes",
};

const ESTADOS = ["pendiente", "aprobada", "rechazada"] as const;
type EstadoAprobacion = (typeof ESTADOS)[number];

type EmpresaRow = {
  id: string;
  razon_social: string;
  cuit: string;
  rubro: string;
  created_at: string;
  usuario_id: string;
  usuarios: { nombre: string; apellido: string; telefono: string } | null;
};

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

function formatearFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function AdminEmpresasPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const { estado: raw } = await searchParams;
  const estado: EstadoAprobacion = ESTADOS.includes(raw as EstadoAprobacion)
    ? (raw as EstadoAprobacion)
    : "pendiente";

  const [{ data: empresasData }, { data: authData }] = await Promise.all([
    supabaseAdmin
      .from("empresas")
      .select(
        "id, razon_social, cuit, rubro, created_at, usuario_id, usuarios(nombre, apellido, telefono)"
      )
      .eq("estado_aprobacion", estado)
      .order("created_at", { ascending: estado === "pendiente" }),
    supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  const empresas = (empresasData ?? []) as unknown as EmpresaRow[];
  const emailMap = new Map<string, string>(
    ((authData as { users?: { id: string; email?: string }[] })?.users ?? []).map(
      (u) => [u.id, u.email ?? ""]
    )
  );

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/admin" className="hover:text-foreground">
          Panel
        </Link>
        <span>/</span>
        <span className="text-foreground">Empresas</span>
      </div>

      <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        Empresas
      </h1>

      {/* Barra de pestañas */}
      <div className="mt-6 flex gap-1 rounded-[var(--radius-md)] border border-border bg-surface p-1">
        {ESTADOS.map((tab) => (
          <Link
            key={tab}
            href={`?estado=${tab}`}
            className={
              tab === estado
                ? "flex-1 rounded-[var(--radius-sm)] bg-primary px-3 py-2 text-center text-sm font-medium text-primary-foreground"
                : "flex-1 rounded-[var(--radius-sm)] px-3 py-2 text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
            }
          >
            {LABELS[tab]}
          </Link>
        ))}
      </div>

      {empresas.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">
          No hay empresas{" "}
          {estado === "pendiente"
            ? "pendientes de revisión"
            : estado === "aprobada"
              ? "aprobadas"
              : "rechazadas"}{" "}
          en este momento.
        </p>
      ) : (
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
                      {empresa.razon_social}
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
                      {formatearFecha(empresa.created_at)}
                    </td>
                    <td className="py-4">
                      <EmpresaAcciones
                        empresaId={empresa.id}
                        razonSocial={empresa.razon_social}
                        estadoActual={estado}
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
                  <p className="font-semibold text-foreground">
                    {empresa.razon_social}
                  </p>
                  <Badge variant={BADGE_VARIANT[estado]}>{LABELS[estado]}</Badge>
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
                      {formatearFecha(empresa.created_at)}
                    </dd>
                  </div>
                </dl>
                <div className="mt-4">
                  <EmpresaAcciones
                    empresaId={empresa.id}
                    razonSocial={empresa.razon_social}
                    estadoActual={estado}
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
