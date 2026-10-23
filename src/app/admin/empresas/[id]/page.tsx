import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CircleCheck } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requerirRolPagina } from "@/lib/auth";
import { logError } from "@/lib/logger";
import { esUuid } from "@/lib/validaciones";
import { formatearCUIT } from "@/lib/cuit";
import { formatFecha, formatFechaHora } from "@/lib/fechas";
import { inicialesDeEmpresa } from "@/lib/iniciales";
import { fotoDePerfil } from "@/lib/fotos-perfil";
import { idsEmpresasSinConfirmar } from "@/lib/admin/empresas-sin-confirmar";
import {
  ESTADO_EMPRESA_LABEL,
  esEstadoEmpresa,
  historialValido,
  type EstadoAprobacion,
} from "@/lib/admin/historial-empresa";
import { BotonVolver } from "@/components/ui/boton-volver";
import { AvatarAjustado } from "@/components/ui/avatar-ajustado";
import { Badge, type TonoBadge } from "@/components/ui/badge";
import { DatosClave } from "@/components/ui/datos-clave";
import { LineaDeTiempo, type EventoLinea } from "@/components/ui/linea-de-tiempo";
import { Cita } from "@/components/ui/cita";
import { EmpresaAcciones } from "../acciones";

export const metadata: Metadata = {
  title: "Empresa | Panel municipal | Portal de Empleo Funes",
};

const TONO_ESTADO: Record<EstadoAprobacion, TonoBadge> = {
  pendiente: "warning",
  aprobada: "success",
  rechazada: "danger",
};

const TARJETA = "tarjeta px-4 py-5 sm:p-6";
const TITULO_TARJETA = "text-lg leading-snug font-extrabold text-heading";

export default async function AdminEmpresaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requerirRolPagina("municipalidad");
  const { id } = await params;
  if (!esUuid(id)) notFound();

  const supabase = await createSupabaseServerClient();
  const [{ data: empresa, error }, sinConfirmar] = await Promise.all([
    supabase
      .from("empresas")
      .select(
        "id, razon_social, cuit, rubro, descripcion, estado_aprobacion, fecha_decision, motivo_rechazo, created_at, usuario_id, usuarios(nombre, apellido, telefono)"
      )
      .eq("id", id)
      .maybeSingle(),
    idsEmpresasSinConfirmar(supabase),
  ]);

  if (error) logError("admin_empresa_detalle", error, { empresaId: id });
  if (!empresa || !esEstadoEmpresa(empresa.estado_aprobacion)) notFound();
  if (sinConfirmar.error) logError("admin_empresa_sin_confirmar", sinConfirmar.error);

  // Para la oficina, una empresa que no confirmó su email todavía no existe
  // (migration_042): no aparece en el listado y no se puede revisar. Si la
  // consulta falla (null) no se muestra el badge.
  const emailConfirmado = sinConfirmar.ids ? !sinConfirmar.ids.includes(empresa.id) : null;
  if (emailConfirmado === false) notFound();

  const estado: EstadoAprobacion = empresa.estado_aprobacion;

  const [{ data: emailRows }, logo, { data: historialRows, error: errorHistorial }] =
    await Promise.all([
      supabase.rpc("emails_de_usuarios", { ids: [empresa.usuario_id] }),
      fotoDePerfil(empresa.usuario_id),
      supabase
        .from("historial_aprobacion_empresa")
        .select("id, empresa_id, evento, motivo, created_at, usuario_id")
        .eq("empresa_id", empresa.id)
        .order("created_at", { ascending: true }),
    ]);
  if (errorHistorial) logError("admin_empresa_historial", errorHistorial, { empresaId: id });

  const historial = historialValido(historialRows ?? []);
  const idsAutores = [
    ...new Set(historial.map((h) => h.usuario_id).filter((u): u is string => Boolean(u))),
  ];
  const { data: autores } =
    idsAutores.length > 0
      ? await supabase.from("usuarios").select("id, nombre, apellido").in("id", idsAutores)
      : { data: [] };
  const nombreAutor = new Map(
    (autores ?? []).map((u) => [u.id, `${u.nombre} ${u.apellido}`])
  );

  const email = emailRows?.[0]?.email ?? null;
  const responsable = empresa.usuarios;
  const ultimoReenvio = historial.filter((h) => h.evento === "reenviada").at(-1);

  const eventos: EventoLinea[] = [
    {
      clave: "solicitada",
      titulo: "Solicitud enviada",
      detalle: formatFechaHora(empresa.created_at),
    },
    ...historial.map((h): EventoLinea => {
      const autor = h.usuario_id ? nombreAutor.get(h.usuario_id) : undefined;
      const cuando = formatFechaHora(h.created_at);
      if (h.evento === "rechazada") {
        return {
          clave: h.id,
          titulo: "Rechazada",
          detalle: (
            <>
              {autor ? `${autor} · ${cuando}` : cuando}
              {h.motivo && <span className="mt-1 block text-control-foreground">Motivo: {h.motivo}</span>}
            </>
          ),
        };
      }
      return {
        clave: h.id,
        titulo: h.evento === "aprobada" ? "Aprobada" : "Solicitud reenviada",
        detalle: h.evento === "aprobada" && autor ? `${autor} · ${cuando}` : cuando,
      };
    }),
  ];

  return (
    <section className="flex w-full max-w-[1200px] flex-col gap-6">
      <div className="flex flex-col gap-4">
        <BotonVolver href={`/admin/empresas?estado=${estado}`} />
        <header className="flex items-start gap-4">
          <AvatarAjustado
            src={logo?.url}
            ajuste={logo?.ajuste}
            iniciales={inicialesDeEmpresa(empresa.razon_social)}
            alt={`Logo de ${empresa.razon_social}`}
            size="md"
          />
          <div className="flex min-w-0 flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <h1 className="min-w-0 text-[26px] leading-[1.15] font-extrabold tracking-[-0.01em] break-words text-heading sm:text-[32px]">
                {empresa.razon_social}
              </h1>
              <Badge tono={TONO_ESTADO[estado]} estado>
                {ESTADO_EMPRESA_LABEL[estado]}
              </Badge>
              {estado === "pendiente" && ultimoReenvio && <Badge tono="warning">Reenviada</Badge>}
            </div>
            <p className="text-base text-muted-foreground">
              {ultimoReenvio
                ? `Solicitud reenviada el ${formatFecha(ultimoReenvio.created_at)}`
                : `Solicitud enviada el ${formatFecha(empresa.created_at)}`}
            </p>
          </div>
        </header>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px] xl:items-start">
        <div className="flex min-w-0 flex-col gap-6">
          <section aria-labelledby="titulo-datos" className={TARJETA}>
            <h2 id="titulo-datos" className={TITULO_TARJETA}>
              Datos de la empresa
            </h2>
            <DatosClave
              className="mt-5"
              datos={[
                { etiqueta: "Razón social", valor: empresa.razon_social },
                {
                  etiqueta: "CUIT",
                  valor: <span className="tabular-nums">{formatearCUIT(empresa.cuit)}</span>,
                },
                { etiqueta: "Rubro", valor: empresa.rubro },
                {
                  etiqueta: "Descripción",
                  valor: empresa.descripcion ? (
                    <span className="whitespace-pre-line">{empresa.descripcion}</span>
                  ) : null,
                },
              ]}
            />
          </section>

          <section aria-labelledby="titulo-responsable" className={TARJETA}>
            <h2 id="titulo-responsable" className={TITULO_TARJETA}>
              Persona responsable
            </h2>
            <DatosClave
              className="mt-5"
              datos={[
                {
                  etiqueta: "Nombre",
                  valor: responsable ? `${responsable.nombre} ${responsable.apellido}` : "—",
                },
                { etiqueta: "Teléfono", valor: responsable?.telefono || "—" },
                {
                  etiqueta: "Email",
                  valor: (
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="break-all">{email ?? "—"}</span>
                      {emailConfirmado === true && (
                        <Badge tono="success" icono={CircleCheck}>
                          Email confirmado
                        </Badge>
                      )}
                    </span>
                  ),
                },
              ]}
            />
          </section>

          <section aria-labelledby="titulo-historial" className={TARJETA}>
            <h2 id="titulo-historial" className={TITULO_TARJETA}>
              Historial de la solicitud
            </h2>
            {errorHistorial ? (
              <p role="alert" className="mt-4 text-sm text-danger">
                No pudimos cargar el historial. Intentá de nuevo en unos minutos.
              </p>
            ) : (
              <LineaDeTiempo className="mt-5" eventos={eventos} />
            )}
          </section>
        </div>

        <section aria-labelledby="titulo-decision" className={`${TARJETA} xl:sticky xl:top-6`}>
          <h2 id="titulo-decision" className={TITULO_TARJETA}>
            Decisión
          </h2>
          {estado === "pendiente" ? (
            <p className="mt-2 text-[15px] text-muted-foreground-strong">
              Si la aprobás, la empresa puede publicar ofertas. Cada oferta pasa igual por tu
              revisión.
            </p>
          ) : (
            <div className="mt-3 flex flex-col gap-3">
              <p className="flex flex-wrap items-center gap-2 text-[15px] text-muted-foreground-strong">
                <Badge tono={TONO_ESTADO[estado]} estado>
                  {ESTADO_EMPRESA_LABEL[estado]}
                </Badge>
                {empresa.fecha_decision && <span>el {formatFecha(empresa.fecha_decision)}</span>}
              </p>
              {estado === "rechazada" && empresa.motivo_rechazo && (
                <Cita>{empresa.motivo_rechazo}</Cita>
              )}
            </div>
          )}
          <div className="mt-5">
            <EmpresaAcciones
              empresaId={empresa.id}
              razonSocial={empresa.razon_social}
              estadoActual={estado}
            />
          </div>
        </section>
      </div>
    </section>
  );
}
