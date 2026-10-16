import { redirect } from "next/navigation";
import { panelDeRol, requerirUsuarioPagina } from "@/lib/auth";

export default async function InicioPage() {
  const usuario = await requerirUsuarioPagina();
  redirect(usuario.perfil ? panelDeRol(usuario.perfil.rol) : "/perfil");
}
