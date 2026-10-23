import type { BajaOferta } from "@/lib/empresa/bajas-oferta";
import type { EstiloBoton } from "@/components/ui/dialogo-confirmacion";
import { EliminarEnvioBtn } from "./eliminar-envio-btn";
import { RetirarOfertaBtn } from "./retirar-oferta-btn";

interface Props {
  oferta: { id: string; titulo: string; estado: string };
  baja: BajaOferta;
  /** Adónde ir después de la baja; sin valor, se refresca la página actual. */
  volverA?: string;
  /** Estilo del botón; por defecto, el rojo chico de Mis ofertas. */
  estiloBoton?: EstiloBoton;
  claseBoton?: string;
}

/** El único botón de baja de una oferta ("Eliminar" o "Retirar oferta"), según bajasDeOfertas. */
export function BajaOfertaBtn({ oferta, baja, volverA, estiloBoton, claseBoton }: Props) {
  if (baja.acciones.mostrarEliminar) {
    return (
      <EliminarEnvioBtn
        ofertaId={oferta.id}
        ofertaTitulo={oferta.titulo}
        esBorrador={oferta.estado === "borrador"}
        volverA={volverA}
        estiloBoton={estiloBoton}
        claseBoton={claseBoton}
      />
    );
  }
  if (baja.acciones.mostrarRetirar) {
    return (
      <RetirarOfertaBtn
        ofertaId={oferta.id}
        ofertaTitulo={oferta.titulo}
        postulacionesOficina={baja.procesos.oficina}
        candidatosDerivados={baja.procesos.derivados}
        volverA={volverA}
        estiloBoton={estiloBoton}
        claseBoton={claseBoton}
      />
    );
  }
  return null;
}
