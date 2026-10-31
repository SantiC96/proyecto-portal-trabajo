import type { Metadata } from "next";
import { UserCog } from "lucide-react";
import { requerirRolPagina } from "@/lib/auth";
import { fotoDePerfil } from "@/lib/fotos-perfil";
import { formatFechaCorta, formatFechaHora } from "@/lib/fechas";
import { BotonVolver } from "@/components/ui/boton-volver";
import { Badge } from "@/components/ui/badge";
import { EncabezadoPagina } from "@/components/ui/encabezado-pagina";
import { EncabezadoPerfil } from "@/components/perfil/encabezado-perfil";
import { inicialesDePersona } from "@/lib/iniciales";
import { DatosContactoForm } from "@/components/perfil/datos-contacto-form";
import { EdicionPerfil } from "@/components/perfil/tarjeta-editable";
import { CampoLectura, GrillaLectura, SeccionPerfil } from "@/components/perfil/piezas";
import { SeccionContrasenaCandado } from "@/components/perfil/seccion-contrasena-candado";

export const metadata: Metadata = {
  title: "Mi perfil | Panel municipal | Portal de Empleo Funes",
};

export default async function AdminPerfilPage() {
  const usuario = await requerirRolPagina("municipalidad");
  const { perfil } = usuario;
  const foto = await fotoDePerfil(usuario.id);
  // Una cuenta desactivada no llega acá (requerirRolPagina): siempre está activa.
  const estado = perfil.activo ? "Activa" : "Desactivada";

  return (
    <section className="flex w-full flex-col gap-6">
      <BotonVolver href="/admin" destacado />
      <EncabezadoPagina
        banda
        botonesBlancos
        className="-mt-2"
        titulo="Mi perfil"
        bajada="Los datos de tu cuenta de la Oficina de Empleo en el portal."
      />

      <EdicionPerfil>
        <div className="flex flex-col gap-6">
          <EncabezadoPerfil
            destacado
            accionesAlCostado
            tituloSeccion="Foto"
            avatarActivo={foto}
            titulo={`${perfil.nombre} ${perfil.apellido}`}
            subtitulo="Oficina de Empleo"
            debajo={
              <Badge tono={perfil.activo ? "success" : "neutral"} estado>
                {estado}
              </Badge>
            }
            iniciales={inicialesDePersona(perfil.nombre, perfil.apellido)}
          />

          {/* En escritorio las dos tarjetas miden lo mismo; en el celular, lo suyo. */}
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2 lg:items-stretch lg:*:h-full">
            <DatosContactoForm
              variante="tarjeta"
              titulo="Datos personales"
              datos={{
                nombre: perfil.nombre,
                apellido: perfil.apellido,
                telefono: perfil.telefono ?? "",
              }}
              email={usuario.email ?? ""}
            />

            <SeccionPerfil id="cuenta" titulo="Cuenta" icono={UserCog}>
              <GrillaLectura>
                <CampoLectura estiloPerfil chipVacio={false} label="Rol" valor="Oficina de Empleo" />
                <CampoLectura estiloPerfil chipVacio={false} label="Estado" valor={estado} />
                <CampoLectura
                  estiloPerfil
                  chipVacio={false}
                  label="Alta"
                  valor={formatFechaCorta(perfil.created_at)}
                />
                <CampoLectura
                  estiloPerfil
                  chipVacio={false}
                  label="Último ingreso"
                  valor={usuario.ultimoIngreso ? formatFechaHora(usuario.ultimoIngreso) : ""}
                />
              </GrillaLectura>
            </SeccionPerfil>
          </div>

          <SeccionContrasenaCandado />
        </div>
      </EdicionPerfil>
    </section>
  );
}
