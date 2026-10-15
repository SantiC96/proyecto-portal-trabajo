import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { PublicFooter } from "@/components/public/public-footer";
import { CorregirSolicitudForm } from "./_components/corregir-form";

export const metadata: Metadata = {
  title: "Corregir solicitud | Portal de Empleo Funes",
};

export default async function SolicitudEmpresaPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const [{ data: usuario }, { data: empresa }, { data: categoriasData }] =
    await Promise.all([
      supabase
        .from("usuarios")
        .select("nombre, apellido, telefono, rol")
        .eq("id", user.id)
        .single(),
      supabase
        .from("empresas")
        .select("estado_aprobacion, razon_social, cuit, rubro, descripcion, motivo_rechazo")
        .eq("usuario_id", user.id)
        .maybeSingle(),
      supabase.from("categorias").select("id, nombre").order("nombre"),
    ]);

  if (!usuario || usuario.rol !== "empresa") redirect("/");
  if (!empresa) redirect("/");

  // Si no está rechazada, redirigir a la pantalla correspondiente.
  if (empresa.estado_aprobacion !== "rechazada") redirect("/empresa");

  return (
    <>
      <main className="flex-1">
        <section className="flex justify-center px-4 py-10 sm:px-6">
          <div className="w-full max-w-xl">
            <div className="mb-6 text-center">
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
      <PublicFooter />
    </>
  );
}
