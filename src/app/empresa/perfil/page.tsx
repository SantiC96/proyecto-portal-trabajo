import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requerirRolPagina, obtenerEmpresaActual } from "@/lib/auth";
import { fotoDePerfil } from "@/lib/fotos-perfil";
import { formatearCUIT } from "@/lib/cuit";
import { BotonVolver } from "@/components/ui/boton-volver";
import { EncabezadoPerfil } from "@/components/perfil/encabezado-perfil";
import { inicialesDeEmpresa, inicialesDePersona } from "@/lib/iniciales";
import { DatosContactoForm } from "@/components/perfil/datos-contacto-form";
import { SeccionContrasena } from "@/components/perfil/seccion-contrasena";
import { CampoLectura, SectionTitle } from "@/components/perfil/piezas";

export const metadata: Metadata = {
  title: "Mi perfil | Portal de Empleo Funes",
};

const ESTADO_LABEL: Record<string, string> = {
  pendiente: "En revisión por la Oficina de Empleo",
  aprobada: "Aprobada",
  rechazada: "Rechazada",
};

// Fuera de (panel): la empresa ve su perfil en cualquier estado de aprobación.
// Los datos de la empresa no se editan acá; si la solicitud fue rechazada se
// corrigen con el flujo que ya existe (/empresa/solicitud).
export default async function EmpresaPerfilPage() {
  const usuario = await requerirRolPagina("empresa");
  const { perfil } = usuario;
  const [empresa, foto] = await Promise.all([
    obtenerEmpresaActual(),
    fotoDePerfil(usuario.id),
  ]);
  if (!empresa) redirect("/");

  const persona = `${perfil.nombre} ${perfil.apellido}`.trim();
  const nombreEmpresa = empresa.razon_social.trim();

  return (
    <>
      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
          <BotonVolver href="/empresa">Volver al panel</BotonVolver>
          <h1 className="mb-6 mt-4 text-2xl font-bold tracking-tight text-foreground">
            Mi perfil
          </h1>

          <div className="flex flex-col gap-6">
            <EncabezadoPerfil
              avatarActivo={foto}
              titulo={nombreEmpresa || persona}
              subtitulo={nombreEmpresa ? persona : "Empresa"}
              iniciales={
                inicialesDeEmpresa(nombreEmpresa) ??
                inicialesDePersona(perfil.nombre, perfil.apellido)
              }
              variante="logo"
            />
            <DatosContactoForm
              datos={{
                nombre: perfil.nombre,
                apellido: perfil.apellido,
                telefono: perfil.telefono ?? "",
              }}
              email={usuario.email ?? ""}
            />

            <div className="rounded-2xl border border-border bg-white px-4 py-5 shadow-sm sm:px-6 sm:py-6">
              <SectionTitle>Datos de la empresa</SectionTitle>
              <div className="mt-4 grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
                <CampoLectura label="Razón social" valor={empresa.razon_social} />
                <CampoLectura label="CUIT" valor={formatearCUIT(empresa.cuit)} />
                <CampoLectura label="Rubro" valor={empresa.rubro} />
                <CampoLectura
                  label="Estado"
                  valor={ESTADO_LABEL[empresa.estado_aprobacion] ?? empresa.estado_aprobacion}
                />
                <CampoLectura
                  label="Descripción"
                  valor={empresa.descripcion ?? ""}
                  className="sm:col-span-2"
                />
              </div>
              {empresa.estado_aprobacion === "rechazada" ? (
                <Link
                  href="/empresa/solicitud"
                  className="btn-primario mt-5 min-h-11 justify-center px-5"
                >
                  Corregir y reenviar solicitud
                </Link>
              ) : (
                <p className="mt-5 text-xs text-muted-icon">
                  Para corregir estos datos, comunicate con la Oficina de Empleo.
                </p>
              )}
            </div>

            <SeccionContrasena />
          </div>
        </section>
      </main>
    </>
  );
}
