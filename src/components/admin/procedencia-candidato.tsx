import type { ReactNode } from "react";
import { MapPin } from "lucide-react";
import type { ComprobanteVista } from "@/lib/comprobantes";
import type { NivelPrioridad } from "@/lib/procedencia";
import { esLocalidadFunes } from "@/lib/localidades";
import { textoTamanoArchivo } from "@/lib/archivos";
import { formatFecha, formatFechaHora } from "@/lib/fechas";
import { ChipLocalidad } from "@/components/postulantes/badge-procedencia";
import { RevisarComprobante } from "@/components/admin/revisar-comprobante";
import { BotonVerArchivo } from "@/components/admin/boton-ver-archivo";
import { FilaArchivoPerfil } from "@/components/perfil/piezas";
import { Badge, type TonoBadge } from "@/components/ui/badge";
import { TituloBloque } from "@/components/ui/titulo-bloque";
import { cn } from "@/lib/utils";

const ESTADO: Record<ComprobanteVista["estado"], { texto: string; tono: TonoBadge }> = {
  pendiente: { texto: "Pendiente de revisión", tono: "warning" },
  aprobado: { texto: "Aprobado", tono: "success" },
  rechazado: { texto: "Rechazado", tono: "danger" },
};

function Dato({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="text-[13px] leading-[1.4] font-bold text-neutral">{etiqueta}</dt>
      <dd className="text-base leading-[1.45] break-words text-control-foreground">{children}</dd>
    </div>
  );
}

/**
 * "Procedencia" del perfil del postulante de la oficina (migration_055): el
 * chip de localidad arriba a la derecha, la localidad y, al pie de la tarjeta,
 * el comprobante de domicilio como fila de archivo con su estado, la revisión
 * y los botones para revisarlo cuando está pendiente.
 */
export function ProcedenciaCandidato({
  localidad,
  nivel,
  comprobante,
  className,
}: {
  localidad: string | null;
  nivel: NivelPrioridad;
  comprobante: ComprobanteVista | null;
  className?: string;
}) {
  const esFunes = esLocalidadFunes(localidad);

  return (
    <section
      aria-labelledby="titulo-procedencia"
      className={cn("tarjeta tarjeta-panel flex min-w-0 flex-col", className)}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <TituloBloque id="titulo-procedencia" titulo="Procedencia" icono={MapPin} />
        <ChipLocalidad nivel={nivel} localidad={localidad} />
      </div>

      <dl className="mt-5 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
        <Dato etiqueta="Localidad">
          {localidad ?? <span className="text-muted-foreground">Sin informar</span>}
        </Dato>
        {esFunes && !comprobante && <Dato etiqueta="Comprobante de domicilio">No subió ninguno</Dato>}
      </dl>

      {esFunes && comprobante && (
        // Al pie de la tarjeta: queda alineado con el final de "Datos del candidato".
        <div className="mt-auto flex flex-col gap-2 pt-5">
          <h3 className="text-[13px] leading-[1.4] font-bold text-neutral">Comprobante de domicilio</h3>
          <FilaArchivoPerfil
            className="sm:flex-col sm:items-stretch"
            nombre={comprobante.nombreOriginal}
            detalle={`${comprobante.tamano > 0 ? `${textoTamanoArchivo(comprobante.tamano)} · ` : ""}${
              comprobante.esImagen ? "Imagen" : "PDF"
            } · Subido el ${formatFecha(comprobante.subidoEn)}`}
            nota={
              <>
                {comprobante.revisadoEn && <p>Revisado el {formatFechaHora(comprobante.revisadoEn)}</p>}
                {comprobante.estado === "rechazado" && comprobante.motivo && (
                  <p className="mt-0.5 whitespace-pre-line break-words text-motivo-rechazo">
                    <strong className="font-bold">Motivo:</strong> {comprobante.motivo}
                  </p>
                )}
              </>
            }
            badge={
              <Badge tono={ESTADO[comprobante.estado].tono} estado>
                {ESTADO[comprobante.estado].texto}
              </Badge>
            }
            acciones={
              <>
                <BotonVerArchivo url={comprobante.url} texto="Ver comprobante" />
                {comprobante.estado === "pendiente" && (
                  <RevisarComprobante archivoId={comprobante.id} />
                )}
              </>
            }
          />
        </div>
      )}
    </section>
  );
}
