import type { Metadata } from "next";
import Image from "next/image";
import { LinkVolverAuth } from "@/components/auth/link-volver-auth";
import { PanelMarca } from "@/components/auth/panel-marca";
import { RegistroPostulanteForm } from "@/components/auth/registro-postulante-form";
import { RegistroEmpresaForm } from "@/components/auth/registro-empresa-form";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const metadata: Metadata = {
  title: "Registro | Portal de Empleo Funes",
  description:
    "Creá tu cuenta en el Portal de Empleo de la Municipalidad de Funes.",
};

interface Props {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

const PANEL = {
  postulante: {
    volanta: "Talento local, nuevas oportunidades",
    titulo: "Sumate al Portal de Empleo.",
    bajada: "Cargá tus datos una vez y postulate a las ofertas de empresas de la ciudad.",
  },
  empresa: {
    volanta: "Empresas de Funes",
    titulo: "Encontrá a tu próximo equipo en Funes.",
    bajada: "Publicá tus ofertas y recibí candidatos preseleccionados por la Oficina de Empleo.",
  },
};

export default async function RegistroPage({ searchParams }: Props) {
  const { tipo } = await searchParams;
  const esEmpresa = tipo === "empresa";

  let formulario = <RegistroPostulanteForm />;
  if (esEmpresa) {
    const supabase = await createSupabaseServerClient();
    const { data: categorias } = await supabase
      .from("categorias")
      .select("id, nombre")
      .order("nombre");
    formulario = <RegistroEmpresaForm categorias={categorias ?? []} />;
  }

  const panel = PANEL[esEmpresa ? "empresa" : "postulante"];

  // Como el login: el panel verde a la izquierda (arriba y más corto en el
  // celular) y el formulario en una tarjeta de 720 px a la derecha.
  return (
    <main className="login-pantalla">
      <PanelMarca {...panel} fijo volver={<LinkVolverAuth claro />} />

      <div className="login-columna">
        <div className="w-full max-w-[720px]">
          {/* En el celular el link va dentro del panel verde. */}
          <div className="hidden lg:block">
            <LinkVolverAuth />
          </div>
          <div className="auth-tarjeta login-entrada login-entrada--demorada">
            <Image
              src="/images/logo-funes-verde.png"
              alt="Municipalidad de Funes"
              width={120}
              height={34}
              className="mx-auto mb-6 hidden h-auto w-[120px] lg:block"
              loading="eager"
            />
            {formulario}
          </div>
        </div>
      </div>
    </main>
  );
}
