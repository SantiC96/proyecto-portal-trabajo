import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { err, type ResultadoError } from "@/lib/resultado";
import { HEADER_RUTA_ACTUAL, urlAvisoOtroRol, urlLogin } from "@/lib/redirect";
import type { Rol, Tabla } from "@/types/db";

// Estos controles son una capa más: la protección principal siguen siendo las
// políticas RLS y las funciones de la base (docs/decisiones/015).

export type { Rol };

export type UsuarioActual = {
  id: string;
  email: string | null;
  metadata: Record<string, unknown>;
  /** Fila de public.usuarios; null si todavía no existe o no se pudo leer. */
  perfil: Tabla<"usuarios"> | null;
};

export type UsuarioConRol<R extends Rol = Rol> = UsuarioActual & {
  perfil: Tabla<"usuarios"> & { rol: R };
};

export type Autorizado<T> = { ok: true } & T;

/** Página de inicio de cada rol. */
export function panelDeRol(rol: Rol): string {
  if (rol === "empresa") return "/empresa";
  if (rol === "municipalidad") return "/admin";
  return "/perfil";
}

/**
 * Usuario autenticado con su fila de usuarios, o null. Valida el token con
 * auth.getUser() y se consulta una sola vez por request.
 */
export const obtenerUsuarioActual = cache(async (): Promise<UsuarioActual | null> => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: perfil } = await supabase
    .from("usuarios")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return {
    id: user.id,
    email: user.email ?? null,
    metadata: user.user_metadata ?? {},
    perfil,
  };
});

function tieneRol<R extends Rol>(
  usuario: UsuarioActual,
  roles: readonly R[],
): usuario is UsuarioConRol<R> {
  const rol = usuario.perfil?.rol;
  return roles.some((r) => r === rol);
}

function comoLista<R extends Rol>(roles: R | readonly R[]): readonly R[] {
  return typeof roles === "string" ? [roles] : roles;
}

/** Fila de empresas del usuario actual, o null. */
export const obtenerEmpresaActual = cache(async (): Promise<Tabla<"empresas"> | null> => {
  const usuario = await obtenerUsuarioActual();
  if (!usuario || usuario.perfil?.rol !== "empresa") return null;

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("empresas")
    .select("*")
    .eq("usuario_id", usuario.id)
    .maybeSingle();
  return data;
});

/** Fila de postulantes del usuario actual, o null. */
export const obtenerPostulanteActual = cache(
  async (): Promise<Tabla<"postulantes"> | null> => {
    const usuario = await obtenerUsuarioActual();
    if (!usuario || usuario.perfil?.rol !== "postulante") return null;

    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("postulantes")
      .select("*")
      .eq("usuario_id", usuario.id)
      .maybeSingle();
    return data;
  },
);

// ── Server actions: devuelven un Resultado de error en vez de redirigir ─────

export async function requerirUsuario(): Promise<
  Autorizado<{ usuario: UsuarioActual }> | ResultadoError
> {
  const usuario = await obtenerUsuarioActual();
  if (!usuario) return err("NO_AUTENTICADO");
  return { ok: true, usuario };
}

export async function requerirRol<R extends Rol>(
  roles: R | readonly R[],
): Promise<Autorizado<{ usuario: UsuarioConRol<R> }> | ResultadoError> {
  const usuario = await obtenerUsuarioActual();
  if (!usuario) return err("NO_AUTENTICADO");
  if (!tieneRol(usuario, comoLista(roles))) return err("SIN_PERMISO");
  return { ok: true, usuario };
}

export async function requerirEmpresa(opciones?: {
  /** Exige que la Oficina haya aprobado la empresa. */
  aprobada?: boolean;
  mensajeNoAprobada?: string;
}): Promise<
  | Autorizado<{ usuario: UsuarioConRol<"empresa">; empresa: Tabla<"empresas"> }>
  | ResultadoError
> {
  const auth = await requerirRol("empresa");
  if (!auth.ok) return auth;

  const empresa = await obtenerEmpresaActual();
  if (!empresa) return err("SIN_PERMISO");
  if (opciones?.aprobada && empresa.estado_aprobacion !== "aprobada") {
    return err("SIN_PERMISO", opciones.mensajeNoAprobada);
  }
  return { ok: true, usuario: auth.usuario, empresa };
}

export async function requerirPostulante(opciones?: {
  mensajeSinPermiso?: string;
}): Promise<
  | Autorizado<{ usuario: UsuarioConRol<"postulante">; postulante: Tabla<"postulantes"> }>
  | ResultadoError
> {
  const usuario = await obtenerUsuarioActual();
  if (!usuario) return err("NO_AUTENTICADO");
  if (!tieneRol(usuario, ["postulante"])) {
    return err("SIN_PERMISO", opciones?.mensajeSinPermiso);
  }

  const postulante = await obtenerPostulanteActual();
  if (!postulante) return err("SIN_PERMISO", opciones?.mensajeSinPermiso);
  return { ok: true, usuario, postulante };
}

// ── Páginas y layouts: redirigen en vez de devolver un error ────────────────

/** Ruta pedida (pathname + search), según el encabezado que pone el proxy. */
async function rutaActual(): Promise<string | null> {
  return (await headers()).get(HEADER_RUTA_ACTUAL);
}

/** Sin sesión redirige al login, que después vuelve a la ruta pedida. */
export async function requerirUsuarioPagina(): Promise<UsuarioActual> {
  const usuario = await obtenerUsuarioActual();
  if (!usuario) redirect(urlLogin(await rutaActual()));
  return usuario;
}

/**
 * Sin sesión redirige al login. Con la sesión de otro rol redirige al inicio
 * con el aviso de sesión activa, que explica para qué cuenta es la página y
 * ofrece cerrar sesión y volver a ella. Sin rol cargado va al inicio.
 */
export async function requerirRolPagina<R extends Rol>(
  roles: R | readonly R[],
): Promise<UsuarioConRol<R>> {
  const usuario = await requerirUsuarioPagina();
  const lista = comoLista(roles);
  if (tieneRol(usuario, lista)) return usuario;

  if (!usuario.perfil?.rol) redirect("/");
  redirect(urlAvisoOtroRol(lista, await rutaActual()));
}

/** Sin sesión redirige al login; si el usuario no tiene empresa, a `siNoHay`. */
export async function requerirEmpresaPagina(siNoHay = "/"): Promise<Tabla<"empresas">> {
  await requerirUsuarioPagina();
  const empresa = await obtenerEmpresaActual();
  if (!empresa) redirect(siNoHay);
  return empresa;
}
