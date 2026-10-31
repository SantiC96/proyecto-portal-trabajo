import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  AlignLeft,
  Building2,
  CircleCheck,
  Hash,
  History,
  Mail,
  Phone,
  Tag,
  User,
} from "lucide-react";
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
import { DetalleConLateral } from "@/components/ui/detalle-con-lateral";
import { AvatarAjustado } from "@/components/ui/avatar-ajustado";
import { BadgeBanda, Chip, type TonoBadge } from "@/components/ui/badge";
import { EncabezadoPagina } from "@/components/ui/encabezado-pagina";
import { TituloBloque } from "@/components/ui/titulo-bloque";
import { MosaicosDatos } from "@/components/ui/mosaicos-datos";
import { ResultadoDecision, TarjetaDecision } from "@/components/ui/tarjeta-decision";
import {
  ICONO_HISTORIAL,
  LineaDeTiempo,
  MotivoRechazo,
  type EventoLinea,
} from "@/components/ui/linea-de-tiempo";
import { EmpresaAcciones } from "../acciones";

export const metadata: Metadata = {
  title: "Empresa | Panel municipal | Portal de Empleo Funes",
};

const TONO_ESTADO: Record<EstadoAprobacion, TonoBadge> = {
  pendiente: "warning",
  aprobada: "success",
  rechazada: "danger",
};

const TARJETA = "tarjeta tarjeta-panel min-w-0";

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
  // consulta falla (null) no se muestra el chip.
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
  const cuit = formatearCUIT(empresa.cuit);
  const ultimoReenvio = historial.filter((h) => h.evento === "reenviada").at(-1);

  // La decisión vigente: el último evento del historial con el estado actual
  // (de ahí sale quién la tomó).
  const ultimaDecision = estado === "pendiente" ? undefined : historial.filter((h) => h.evento === estado).at(-1);
  const fechaDecision = empresa.fecha_decision ?? ultimaDecision?.created_at ?? null;
  const autorDecision = ultimaDecision?.usuario_id ? nombreAutor.get(ultimaDecision.usuario_id) : undefined;
  const textoDecision =
    estado === "pendiente"
      ? null
      : `${ESTADO_EMPRESA_LABEL[estado]}${fechaDecision ? ` el ${formatFecha(fechaDecision)}` : ""}${
          autorDecision ? ` por ${autorDecision}` : ""
        }`;

  const eventos: EventoLinea[] = [
    {
      clave: "solicitada",
      titulo: "Solicitud enviada",
      detalle: formatFechaHora(empresa.created_at),
      ...ICONO_HISTORIAL.enviado,
    },
    ...historial.map((h): EventoLinea => {
      const autor = h.usuario_id ? nombreAutor.get(h.usuario_id) : undefined;
      const cuando = formatFechaHora(h.created_at);
      if (h.evento === "rechazada") {
        return {
          clave: h.id,
          titulo: "Rechazada",
          detalle: autor ? `${cuando} · ${autor}` : cuando,
          nota: h.motivo ? <MotivoRechazo>{h.motivo}</MotivoRechazo> : undefined,
          ...ICONO_HISTORIAL.rechazado,
        };
      }
      if (h.evento === "aprobada") {
        return {
          clave: h.id,
          titulo: "Aprobada",
          detalle: autor ? `${cuando} · ${autor}` : cuando,
          ...ICONO_HISTORIAL.aprobado,
        };
      }
      return {
        clave: h.id,
        titulo: "Solicitud reenviada",
        detalle: cuando,
        ...ICONO_HISTORIAL.actualizado,
      };
    }),
  ];

  return (
    <section className="flex w-full flex-col gap-6">
      <BotonVolver href={`/admin/empresas?estado=${estado}`} destacado />

      <EncabezadoPagina
        banda
        botonesBlancos
        className="-mt-2"
        avatar={
          <AvatarAjustado
            src={logo?.url}
            ajuste={logo?.ajuste}
            iniciales={inicialesDeEmpresa(empresa.razon_social)}
            alt={`Logo de ${empresa.razon_social}`}
            size="banda"
            claro
          />
        }
        titulo={empresa.razon_social}
        junto={<BadgeBanda tono={TONO_ESTADO[estado]}>{ESTADO_EMPRESA_LABEL[estado]}</BadgeBanda>}
        bajada={
          ultimoReenvio
            ? `Solicitud reenviada el ${formatFecha(ultimoReenvio.created_at)}`
            : `Solicitud enviada el ${formatFecha(empresa.created_at)}`
        }
      />

      <DetalleConLateral
        anchoLateral={380}
        separacion="gap-4"
        separacionColumnas="gap-5"
        principal={
          <>
            <section aria-labelledby="titulo-datos" className={TARJETA}>
              <TituloBloque id="titulo-datos" titulo="Datos de la empresa" icono={Building2} />
              <MosaicosDatos
                variante="lista"
                className="mt-5"
                datos={[
                  { etiqueta: "Razón social", icono: Building2, valor: empresa.razon_social },
                  { etiqueta: "CUIT", icono: Hash, valor: <span className="tabular-nums">{cuit}</span> },
                  { etiqueta: "Rubro", icono: Tag, valor: empresa.rubro },
                  {
                    etiqueta: "Descripción",
                    icono: AlignLeft,
                    valor: empresa.descripcion ? (
                      <span className="font-normal whitespace-pre-line text-texto-parrafo">
                        {empresa.descripcion}
                      </span>
                    ) : null,
                  },
                ]}
              />
            </section>

            <section aria-labelledby="titulo-responsable" className={TARJETA}>
              <TituloBloque id="titulo-responsable" titulo="Persona responsable" icono={User} />
              <MosaicosDatos
                variante="lista"
                className="mt-5"
                datos={[
                  {
                    etiqueta: "Nombre",
                    icono: User,
                    valor: responsable ? `${responsable.nombre} ${responsable.apellido}` : "—",
                  },
                  { etiqueta: "Teléfono", icono: Phone, valor: responsable?.telefono || "—" },
                  {
                    etiqueta: "Email",
                    icono: Mail,
                    valor: (
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="min-w-0 break-all">{email ?? "—"}</span>
                        {emailConfirmado === true && (
                          <Chip tono="verde" icono={CircleCheck}>
                            Email confirmado
                          </Chip>
                        )}
                      </span>
                    ),
                  },
                ]}
              />
            </section>
          </>
        }
        lateral={
          <>
            <TarjetaDecision
              estado={estado}
              descripcion={
                estado === "pendiente"
                  ? "Si la aprobás, la empresa puede publicar ofertas. Cada oferta pasa igual por tu revisión."
                  : undefined
              }
            >
              {textoDecision && (
                <ResultadoDecision
                  tono={estado === "aprobada" ? "aprobada" : "rechazada"}
                  className="mb-4"
                  detalle={
                    estado === "rechazada" && empresa.motivo_rechazo ? (
                      <>
                        <strong className="font-bold">Motivo:</strong> {empresa.motivo_rechazo}
                      </>
                    ) : undefined
                  }
                >
                  {textoDecision}
                </ResultadoDecision>
              )}
              <EmpresaAcciones
                empresaId={empresa.id}
                razonSocial={empresa.razon_social}
                cuit={cuit}
                estadoActual={estado}
              />
            </TarjetaDecision>

            <section aria-labelledby="titulo-historial" className={TARJETA}>
              <TituloBloque id="titulo-historial" titulo="Historial de la solicitud" icono={History} />
              {errorHistorial ? (
                <p role="alert" className="mt-4 text-sm text-danger">
                  No pudimos cargar el historial. Intentá de nuevo en unos minutos.
                </p>
              ) : (
                <LineaDeTiempo variante="historial" className="mt-5" eventos={eventos} />
              )}
            </section>
          </>
        }
      />
    </section>
  );
}
