"use client";

import { useId, useState, type ReactNode } from "react";
import { Table2 } from "lucide-react";

/**
 * Encabezado de una tarjeta de gráfico con "Ver datos en tabla" a la derecha:
 * el botón (aria-expanded) despliega la tabla debajo del encabezado. El
 * encabezado y la tabla vienen armados del servidor.
 */
export function DesplegarTabla({
  encabezado,
  tabla,
}: {
  encabezado: ReactNode;
  tabla: ReactNode;
}) {
  const [abierta, setAbierta] = useState(false);
  const id = useId();

  return (
    <>
      <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        {encabezado}
        <button
          type="button"
          aria-expanded={abierta}
          aria-controls={id}
          onClick={() => setAbierta((v) => !v)}
          className="btn-neutro btn-chico shrink-0"
        >
          <Table2 aria-hidden="true" />
          {abierta ? "Ocultar tabla" : "Ver datos en tabla"}
        </button>
      </header>
      <div id={id} hidden={!abierta} className="mt-4">
        {tabla}
      </div>
    </>
  );
}
