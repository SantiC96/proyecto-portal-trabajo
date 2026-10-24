import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { obtenerEmpresaActual, requerirRolPagina } from "@/lib/auth";
import { CorregirSolicitudForm } from "./_components/corregir-form";

export const metadata: Metadata = {
  title: "Corregir solicitud | Portal de Empleo Funes",
};

export default async function SolicitudEmpresaPage() {
  const { perfil: usuario } = await requerirRolPagina("empresa");

  const supabase = await createSupabaseServerClient();
  const [empresa, { data: categoriasData }] = await Promise.all([
    obtenerEmpresaActual(),
    supabase.from("categorias").select("id, nombre").order("nombre"),
  ]);

  if (!empresa) redirect("/");

  // Si no está rechazada, redirigir a la pantalla correspondiente.
  if (empresa.estado_aprobacion !== "rechazada") redirect("/empresa");

  return (
    <>
      <main className="flex-1">
        <section>
          <div className="w-full">
            <div className="mb-6">
              <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
                Corregir solicitud
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Revisá los datos, hacé las correcciones necesarias y reenviá tu
                solicitud.
              </p>
            </div>
            <CorregirSolicitudForm
              datos={{
                razonSocial: empresa.razon_social,
                cuit: empresa.cuit,
                rubro: empresa.rubro,
                descripcion: empresa.descripcion ?? "",
                nombre: usuario.nombre,
                apellido: usuario.apellido,
                telefono: usuario.telefono ?? "",
                motivoRechazo: empresa.motivo_rechazo,
                rubros: categoriasData ?? [],
              }}
            />
          </div>
        </section>
      </main>
    </>
  );
}
