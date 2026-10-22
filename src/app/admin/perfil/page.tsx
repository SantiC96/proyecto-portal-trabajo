import type { Metadata } from "next";
import { requerirRolPagina } from "@/lib/auth";
import { fotoDePerfil } from "@/lib/fotos-perfil";
import { BotonVolver } from "@/components/ui/boton-volver";
import { EncabezadoPerfil } from "@/components/perfil/encabezado-perfil";
import { inicialesDePersona } from "@/lib/iniciales";
import { DatosContactoForm } from "@/components/perfil/datos-contacto-form";
import { SeccionContrasena } from "@/components/perfil/seccion-contrasena";

export const metadata: Metadata = {
  title: "Mi perfil | Panel municipal | Portal de Empleo Funes",
};

export default async function AdminPerfilPage() {
  const usuario = await requerirRolPagina("municipalidad");
  const { perfil } = usuario;
  const foto = await fotoDePerfil(usuario.id);

  return (
    <section className="contenido-lectura-ancho">
      <BotonVolver href="/admin">Volver al panel</BotonVolver>
      <h1 className="mb-6 mt-4 text-2xl font-bold tracking-tight text-foreground">Mi perfil</h1>

      <div className="flex flex-col gap-6">
        <EncabezadoPerfil
          avatarActivo={foto}
          titulo={`${perfil.nombre} ${perfil.apellido}`}
          subtitulo="Oficina de Empleo"
          iniciales={inicialesDePersona(perfil.nombre, perfil.apellido)}
        />
        <DatosContactoForm
          datos={{
            nombre: perfil.nombre,
            apellido: perfil.apellido,
            telefono: perfil.telefono ?? "",
          }}
          email={usuario.email ?? ""}
        />
        <SeccionContrasena />
      </div>
    </section>
  );
}
