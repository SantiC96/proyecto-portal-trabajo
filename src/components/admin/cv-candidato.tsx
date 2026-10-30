import { FileText } from "lucide-react";
import type { CvVista } from "@/lib/cvs";
import { CV_MAXIMOS, textoTamanoArchivo } from "@/lib/archivos";
import { formatFecha } from "@/lib/fechas";
import { FilaArchivoPerfil } from "@/components/perfil/piezas";
import { TituloBloque } from "@/components/ui/titulo-bloque";
import { BotonVerArchivo } from "@/components/admin/boton-ver-archivo";
import { cn } from "@/lib/utils";

/**
 * "Currículum vitae" en el perfil del postulante de la oficina: "N de 5 CVs"
 * a la derecha y cada CV como fila de archivo con "Ver CV".
 */
export function CvsDelPostulante({ cvs, className }: { cvs: CvVista[]; className?: string }) {
  return (
    <section aria-labelledby="titulo-cvs" className={cn("tarjeta tarjeta-panel min-w-0", className)}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <TituloBloque id="titulo-cvs" titulo="Currículum vitae" icono={FileText} />
        {cvs.length > 0 && (
          <span className="text-sm font-semibold text-muted-foreground-strong">
            {cvs.length} de {CV_MAXIMOS} CVs
          </span>
        )}
      </div>
      {cvs.length === 0 ? (
        <p className="mt-4 text-[15px] text-muted-foreground">No tiene CVs cargados.</p>
      ) : (
        <ul className="mt-5 flex flex-col gap-2.5">
          {cvs.map((cv) => (
            <li key={cv.id}>
              <FilaArchivoPerfil
                nombre={cv.nombreOriginal}
                detalle={`${cv.tamano > 0 ? `${textoTamanoArchivo(cv.tamano)} · ` : ""}Subido el ${formatFecha(cv.subidoEn)}`}
                acciones={
                  <BotonVerArchivo url={cv.url} texto="Ver CV" etiqueta={`Ver CV ${cv.nombreOriginal}`} />
                }
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
