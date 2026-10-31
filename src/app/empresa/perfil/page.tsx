import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, Lock } from "lucide-react";
import { requerirRolPagina, obtenerEmpresaActual } from "@/lib/auth";
import { fotoDePerfil } from "@/lib/fotos-perfil";
import { formatearCUIT } from "@/lib/cuit";
import { BotonVolver } from "@/components/ui/boton-volver";
import { Badge, type TonoBadge } from "@/components/ui/badge";
import { EncabezadoPagina } from "@/components/ui/encabezado-pagina";
import { EncabezadoPerfil } from "@/components/perfil/encabezado-perfil";
import { inicialesDeEmpresa, inicialesDePersona } from "@/lib/iniciales";
import { DatosContactoForm } from "@/components/perfil/datos-contacto-form";
import { EdicionPerfil } from "@/components/perfil/tarjeta-editable";
import { CampoLectura, GrillaLectura, SeccionPerfil } from "@/components/perfil/piezas";
import { SeccionContrasenaCandado } from "@/components/perfil/seccion-contrasena-candado";

export const metadata: Metadata = {
  title: "Mi perfil | Portal de Empleo Funes",
};

const ESTADO_LABEL: Record<string, string> = {
  pendiente: "En revisión por la Oficina de Empleo",
  aprobada: "Aprobada",
  rechazada: "Rechazada",
};

const ESTADO_TONO: Record<string, TonoBadge> = {
  pendiente: "warning",
  aprobada: "success",
  rechazada: "danger",
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
  const estado = ESTADO_LABEL[empresa.estado_aprobacion] ?? empresa.estado_aprobacion;

  return (
    <main className="flex-1">
      <section className="flex w-full flex-col gap-6">
        <BotonVolver href="/empresa" destacado />
        <EncabezadoPagina
          banda
          className="-mt-2"
          titulo="Mi perfil"
          bajada="Los datos de tu cuenta y de tu empresa en el Portal de Empleo."
        />

        <EdicionPerfil>
          <div className="flex flex-col gap-6">
            <EncabezadoPerfil
              destacado
              accionesAlCostado
              tituloSeccion="Logo"
              avatarActivo={foto}
              titulo={nombreEmpresa || persona}
              subtitulo={persona ? `Contacto: ${persona}` : "Empresa"}
              debajo={
                <Badge tono={ESTADO_TONO[empresa.estado_aprobacion] ?? "neutral"} estado multilinea>
                  {estado}
                </Badge>
              }
              iniciales={
                inicialesDeEmpresa(nombreEmpresa) ??
                inicialesDePersona(perfil.nombre, perfil.apellido)
              }
              variante="logo"
            />

            {/* En escritorio las dos tarjetas miden lo mismo; en el celular, lo suyo. */}
            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2 lg:items-stretch lg:*:h-full">
              <DatosContactoForm
                variante="tarjeta"
                datos={{
                  nombre: perfil.nombre,
                  apellido: perfil.apellido,
                  telefono: perfil.telefono ?? "",
                }}
                email={usuario.email ?? ""}
              />

              <SeccionPerfil
                id="datos-empresa"
                titulo="Datos de la empresa"
                icono={Building2}
              >
                <GrillaLectura>
                  <CampoLectura estiloPerfil chipVacio={false} label="Razón social" valor={empresa.razon_social} />
                  <CampoLectura estiloPerfil chipVacio={false} label="CUIT" valor={formatearCUIT(empresa.cuit)} />
                  <CampoLectura estiloPerfil chipVacio={false} label="Rubro" valor={empresa.rubro} />
                  <CampoLectura estiloPerfil chipVacio={false} label="Estado" valor={estado} />
                  <CampoLectura
                    estiloPerfil
                    chipVacio={false}
                    label="Descripción"
                    valor={empresa.descripcion ?? ""}
                    className="sm:col-span-2"
                  />
                </GrillaLectura>
                {empresa.estado_aprobacion === "rechazada" ? (
                  <Link href="/empresa/solicitud" className="btn-primario self-start">
                    Corregir y reenviar solicitud
                  </Link>
                ) : (
                  <p className="flex items-start gap-2.5 rounded-[var(--radius-lg)] bg-surface-tinted px-4 py-3 text-sm leading-snug font-semibold text-primary-hover">
                    <Lock aria-hidden="true" className="mt-px size-4 shrink-0" />
                    Para corregir estos datos, comunicate con la Oficina de Empleo.
                  </p>
                )}
              </SeccionPerfil>
            </div>

            <SeccionContrasenaCandado />
          </div>
        </EdicionPerfil>
      </section>
    </main>
  );
}
