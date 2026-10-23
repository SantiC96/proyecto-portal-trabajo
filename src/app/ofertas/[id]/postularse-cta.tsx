"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { postularme } from "@/app/(dashboard)/postulaciones/actions";
import { mostrarAviso } from "@/lib/avisos";
import { useAccion } from "@/lib/use-accion";
import type { CvVista } from "@/lib/cvs";
import { DialogoElegirCv } from "@/components/postulantes/dialogo-elegir-cv";

interface Props {
  ofertaId: string;
  ofertaTitulo: string;
  ofertaEmpresa: string;
  /** CVs disponibles, del más nuevo al más viejo. Sin CVs, el diálogo pide cargar uno. */
  cvs: CvVista[];
  /** Abre el diálogo al llegar desde el login (?accion=postular). */
  autoOpen?: boolean;
}

/** Botón "Postularme" de la tarjeta lateral del detalle, con la elección del CV. */
export function PostularseCta({ ofertaId, ofertaTitulo, ofertaEmpresa, cvs, autoOpen = false }: Props) {
  const router = useRouter();
  // Initialize open from autoOpen so the overlay shows immediately on first render
  // without needing a setState call inside an effect
  const [open, setOpen] = useState(autoOpen);
  const { pendiente, ejecutar } = useAccion();

  // Clean the ?accion=postular param from the URL after the auto-open
  useEffect(() => {
    if (autoOpen) {
      const url = new URL(window.location.href);
      url.searchParams.delete("accion");
      router.replace(url.pathname + (url.search || ""), { scroll: false });
    }
  }, [autoOpen, router]);

  function confirmar(cvId: string) {
    ejecutar(async () => {
      const result = await postularme(ofertaId, cvId);
      mostrarAviso(result);
      if (result.ok) {
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn-primario w-full">
        Postularme
      </button>

      <DialogoElegirCv
        abierto={open}
        onCambiarAbierto={setOpen}
        ofertaTitulo={ofertaTitulo}
        empresa={ofertaEmpresa}
        cvs={cvs}
        pendiente={pendiente}
        onConfirmar={confirmar}
        descripcionSinCv={
          <>
            Para postularte a{" "}
            <span className="font-medium text-foreground">{ofertaTitulo}</span> necesitás tener tu
            CV cargado en tu perfil.
          </>
        }
      />
    </>
  );
}
