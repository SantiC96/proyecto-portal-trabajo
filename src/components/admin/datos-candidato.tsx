import type { ReactNode } from "react";
import { ChipSinCompletar } from "@/components/perfil/piezas";
import { EtiquetaRubro } from "@/components/ui/etiqueta-rubro";
import type { Tabla } from "@/types/db";

type Props = Pick<Tabla<"postulantes">, "dni" | "domicilio"> & {
  email: string | null;
  telefono: string | null;
  categorias: Pick<Tabla<"categorias">, "id" | "nombre">[];
};

/** Etiqueta de 13 px 700 `neutral` y valor de 16 px, como el modo lectura de Mi perfil. */
function Dato({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="text-[13px] leading-[1.4] font-bold text-neutral">{etiqueta}</dt>
      <dd className="text-base leading-[1.45] break-words text-control-foreground">{children}</dd>
    </div>
  );
}

/**
 * Datos del candidato en las fichas de la oficina (ficha de la postulación y
 * perfil del postulante): DNI, teléfono, email y domicilio en dos columnas
 * (una en el celular) y los rubros de interés como etiquetas verdes. Sin
 * domicilio, el chip amarillo "Sin completar".
 */
export function DatosCandidato({ email, dni, domicilio, telefono, categorias }: Props) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
      <Dato etiqueta="DNI">
        <span className="tabular-nums">{dni ?? "—"}</span>
      </Dato>
      <Dato etiqueta="Teléfono">{telefono || "—"}</Dato>
      <Dato etiqueta="Email">{email ? <span className="break-all">{email}</span> : "—"}</Dato>
      <Dato etiqueta="Domicilio">
        {domicilio || <ChipSinCompletar>Sin completar</ChipSinCompletar>}
      </Dato>
      <div className="flex min-w-0 flex-col gap-1.5 sm:col-span-2">
        <dt className="text-[13px] leading-[1.4] font-bold text-neutral">Rubros de interés</dt>
        <dd className="flex flex-wrap gap-1.5">
          {categorias.length > 0 ? (
            categorias.map((c) => (
              <EtiquetaRubro key={c.id} verde>
                {c.nombre}
              </EtiquetaRubro>
            ))
          ) : (
            <span className="text-base text-muted-foreground">Sin rubros</span>
          )}
        </dd>
      </div>
    </dl>
  );
}
