import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NuevaContrasenaForm } from "./form";

export default async function NuevaContrasenaFormularioPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/auth/recuperar-contrasena?error=link-vencido");
  }

  return <NuevaContrasenaForm />;
}
