"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import type { AuthError, Session } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { obtenerUsuarioActual } from "@/lib/auth";
import { createSupabaseEphemeralClient } from "@/lib/supabase-ephemeral";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { traducirErrorAuth } from "@/lib/auth-errors";
import { logError } from "@/lib/logger";
import { err, errCampo, errConRef, type Resultado } from "@/lib/resultado";
import { formatearCUIT } from "@/lib/cuit";
import {
  LARGO_MAXIMO,
  leerTexto,
  validarDNI,
  validarTelefono,
  validarEmail,
  validarNombre,
  validarPassword,
  validarCuitConMensaje,
  validarTextoOpcional,
} from "@/lib/validaciones";
import {
  LAST_ACTIVITY_COOKIE,
  lastActivityCookieOptions,
  RECOVERY_COOKIE,
  RECOVERY_COOKIE_PATH,
  recoveryCookieOptions,
} from "@/lib/session-config";
import { programarEnvioEmails } from "@/lib/emails/cola";
import { rutaInterna } from "@/lib/redirect";

function sonTextos(...valores: unknown[]): boolean {
  return valores.every((v) => typeof v === "string");
}

function wrapAuthError(contexto: string, authErr: AuthError): Resultado<never> {
  const r = traducirErrorAuth(authErr);
  if (!r.ok && r.codigo === "ERROR_INTERNO") {
    const ref = logError(contexto, authErr);
    return errConRef("ERROR_INTERNO", r.mensaje, ref);
  }
  return r;
}

/**
 * Compensación cuando signUp creó el usuario pero falló el alta del perfil:
 * borra el usuario de Auth para que pueda registrarse de nuevo.
 *
 * Mientras el email no está confirmado, signUp devuelve el mismo usuario a
 * cada envío. Si el perfil ya existe, lo creó un envío anterior del mismo
 * formulario (doble click, reintento o segunda pestaña) y el error es solo el
 * duplicado: no se borra nada y devuelve true (el alta está completa). Si no
 * se puede verificar, tampoco se borra.
 */
async function deshacerAltaSinPerfil(
  tabla: "postulantes" | "empresas",
  userId: string,
  contexto: string,
): Promise<boolean> {
  const { data: perfil, error } =
    tabla === "postulantes"
      ? await supabaseAdmin.from("postulantes").select("id").eq("usuario_id", userId).maybeSingle()
      : await supabaseAdmin.from("empresas").select("id").eq("usuario_id", userId).maybeSingle();

  if (error) {
    logError(`${contexto}:verificarPerfil`, error, { userId });
    return false;
  }
  if (perfil) return true;

  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (deleteError) logError(`${contexto}:deleteUser`, deleteError, { userId });
  return false;
}

export async function login(credentials: {
  email: string;
  password: string;
  redirectTo?: string;
}): Promise<Resultado<void>> {
  if (await obtenerUsuarioActual()) redirect("/");

  if (
    typeof credentials !== "object" ||
    credentials === null ||
    !sonTextos(credentials.email, credentials.password) ||
    (credentials.redirectTo !== undefined && typeof credentials.redirectTo !== "string")
  ) {
    return err("DATOS_INVALIDOS");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: credentials.email,
    password: credentials.password,
  });

  if (error) return wrapAuthError("login", error);

  // Las Server Actions no pasan por el control del proxy: sin esta cookie, el
  // primer request con sesión se tomaría como una sesión de un navegador anterior.
  const cookieStore = await cookies();
  cookieStore.set(LAST_ACTIVITY_COOKIE, String(Date.now()), lastActivityCookieOptions());

  redirect(rutaInterna(credentials.redirectTo));
}

export async function registrarPostulante(data: {
  nombre: string;
  apellido: string;
  telefono: string;
  dni: string;
  domicilio: string;
  email: string;
  password: string;
}): Promise<Resultado<void>> {
  if (await obtenerUsuarioActual()) redirect("/");

  if (
    typeof data !== "object" ||
    data === null ||
    !sonTextos(data.nombre, data.apellido, data.telefono, data.dni, data.domicilio, data.email, data.password)
  ) {
    return err("DATOS_INVALIDOS");
  }

  const errNombre = validarNombre(data.nombre);
  if (errNombre) return errCampo("nombre", errNombre);
  const errApellido = validarNombre(data.apellido);
  if (errApellido) return errCampo("apellido", errApellido);
  const errDni = validarDNI(data.dni);
  if (errDni) return errCampo("dni", errDni);
  const errTelefono = validarTelefono(data.telefono);
  if (errTelefono) return errCampo("telefono", errTelefono);
  const errEmail = validarEmail(data.email);
  if (errEmail) return errCampo("email", errEmail);
  const errPassword = validarPassword(data.password);
  if (errPassword) return errCampo("password", errPassword);
  const errDomicilio = validarTextoOpcional(data.domicilio, LARGO_MAXIMO.domicilio);
  if (errDomicilio) return errCampo("domicilio", errDomicilio);

  const dniLimpio = data.dni.replace(/\D/g, "");

  const supabase = await createSupabaseServerClient();
  const { data: authData, error: signUpError } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      data: {
        nombre: data.nombre,
        apellido: data.apellido,
        telefono: data.telefono,
        rol: "postulante",
      },
    },
  });

  if (signUpError) return wrapAuthError("registrarPostulante", signUpError);

  if (!authData.user) {
    const ref = logError("registrarPostulante:noUser", null);
    return errConRef("ERROR_INTERNO", "No se pudo crear el usuario. Intentá de nuevo.", ref);
  }

  const { error: profileError } = await supabaseAdmin
    .from("postulantes")
    .insert({ usuario_id: authData.user.id, dni: dniLimpio, domicilio: data.domicilio });

  if (profileError) {
    const altaCompleta = await deshacerAltaSinPerfil("postulantes", authData.user.id, "registrarPostulante");
    if (altaCompleta) redirect("/auth/verificar-email");
    if (profileError.code === "23505") {
      return err("CONFLICTO", "Ya existe una cuenta con ese DNI.");
    }
    const ref = logError("registrarPostulante:profile", profileError, { userId: authData.user.id });
    return errConRef("ERROR_INTERNO", "Error al crear el perfil. Intentá de nuevo.", ref);
  }

  redirect("/auth/verificar-email");
}

export async function registrarEmpresa(data: {
  razonSocial: string;
  cuit: string;
  rubro: string;
  descripcion: string;
  nombre: string;
  apellido: string;
  telefono: string;
  email: string;
  password: string;
}): Promise<Resultado<void>> {
  if (await obtenerUsuarioActual()) redirect("/");

  if (
    typeof data !== "object" ||
    data === null ||
    !sonTextos(
      data.razonSocial,
      data.cuit,
      data.rubro,
      data.descripcion,
      data.nombre,
      data.apellido,
      data.telefono,
      data.email,
      data.password,
    )
  ) {
    return err("DATOS_INVALIDOS");
  }

  const errRazonSocial = validarNombre(data.razonSocial);
  if (errRazonSocial) return errCampo("razonSocial", errRazonSocial);
  const errCuit = validarCuitConMensaje(data.cuit);
  if (errCuit) return errCampo("cuit", errCuit);
  const errNombreEmp = validarNombre(data.nombre);
  if (errNombreEmp) return errCampo("nombre", errNombreEmp);
  const errApellidoEmp = validarNombre(data.apellido);
  if (errApellidoEmp) return errCampo("apellido", errApellidoEmp);
  const errTelefonoEmp = validarTelefono(data.telefono);
  if (errTelefonoEmp) return errCampo("telefono", errTelefonoEmp);
  const errEmailEmp = validarEmail(data.email);
  if (errEmailEmp) return errCampo("email", errEmailEmp);
  const errPasswordEmp = validarPassword(data.password);
  if (errPasswordEmp) return errCampo("password", errPasswordEmp);
  const errRubroEmp = validarTextoOpcional(data.rubro, LARGO_MAXIMO.rubro);
  if (errRubroEmp) return errCampo("rubro", errRubroEmp);
  const errDescripcionEmp = validarTextoOpcional(data.descripcion, LARGO_MAXIMO.descripcion);
  if (errDescripcionEmp) return errCampo("descripcion", errDescripcionEmp);

  const cuitNormalizado = formatearCUIT(data.cuit);

  const supabase = await createSupabaseServerClient();
  const { data: authData, error: signUpError } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      data: {
        nombre: data.nombre,
        apellido: data.apellido,
        telefono: data.telefono,
        rol: "empresa",
      },
    },
  });

  if (signUpError) return wrapAuthError("registrarEmpresa", signUpError);

  if (!authData.user) {
    const ref = logError("registrarEmpresa:noUser", null);
    return errConRef("ERROR_INTERNO", "No se pudo crear el usuario. Intentá de nuevo.", ref);
  }

  const { error: profileError } = await supabaseAdmin
    .from("empresas")
    .insert({
      usuario_id: authData.user.id,
      razon_social: data.razonSocial,
      cuit: cuitNormalizado,
      rubro: data.rubro,
      descripcion: data.descripcion || null,
    });

  if (profileError) {
    const altaCompleta = await deshacerAltaSinPerfil("empresas", authData.user.id, "registrarEmpresa");
    if (altaCompleta) redirect("/auth/verificar-email-empresa");
    if (profileError.code === "23505") {
      return err("CONFLICTO", "Ya existe una empresa registrada con ese CUIT.");
    }
    const ref = logError("registrarEmpresa:profile", profileError, { userId: authData.user.id });
    return errConRef("ERROR_INTERNO", "Error al crear el perfil de empresa. Intentá de nuevo.", ref);
  }

  programarEnvioEmails();
  redirect("/auth/verificar-email-empresa");
}

export async function solicitarResetContrasena(
  formData: FormData
): Promise<void> {
  const email = leerTexto(formData, "email");

  if (validarEmail(email) === null) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/nueva-contrasena`,
    });
  }

  // Always redirect regardless of whether the email exists (avoid account enumeration)
  redirect("/auth/reset-enviado");
}

export async function logout(formData?: FormData): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  // Remove activity cookie so a same-session re-login doesn't find a stale timestamp
  const cookieStore = await cookies();
  cookieStore.delete(LAST_ACTIVITY_COOKIE);

  const rawTo = formData instanceof FormData ? leerTexto(formData, "redirectTo") : null;
  redirect(rawTo ? rutaInterna(rawTo) : "/auth/login");
}

export async function restablecerContrasena(
  _prevState: Resultado<void> | null,
  formData: FormData
): Promise<Resultado<void> | null> {
  const password = leerTexto(formData, "password");
  const confirmar = leerTexto(formData, "confirmar");
  const tokenHash = leerTexto(formData, "token_hash");

  // 1. Server-side validation — no OTP consumed yet
  const errPwd = validarPassword(password);
  if (errPwd) return errCampo("password", errPwd);
  if (password !== confirmar) {
    return errCampo("confirmar", "Las contraseñas no coinciden.");
  }

  const client = createSupabaseEphemeralClient();
  const cookieStore = await cookies();
  let latestSession: Session | null = null;

  // 2a. Try recovery cookie (allows retry without a new link)
  const cookieValue = cookieStore.get(RECOVERY_COOKIE)?.value;
  if (cookieValue) {
    const { data, error } = await client.auth.refreshSession({
      refresh_token: cookieValue,
    });
    if (!error && data.session) {
      latestSession = data.session;
    } else {
      cookieStore.set(RECOVERY_COOKIE, "", {
        maxAge: 0,
        path: RECOVERY_COOKIE_PATH,
        httpOnly: true,
      });
    }
  }

  // 2b. Fall back to token_hash from the email link
  if (!latestSession && tokenHash) {
    const { data, error } = await client.auth.verifyOtp({
      token_hash: tokenHash,
      type: "recovery",
    });
    if (!error && data.session) {
      latestSession = data.session;
    }
  }

  // 2c. Still no session → link expired or already used
  if (!latestSession) {
    cookieStore.set(RECOVERY_COOKIE, "", {
      maxAge: 0,
      path: RECOVERY_COOKIE_PATH,
      httpOnly: true,
    });
    return err("TOKEN_VENCIDO");
  }

  // 3. Update password
  const { error: updateError } = await client.auth.updateUser({ password });

  if (updateError) {
    // Save refresh_token so the user can retry without a new link
    cookieStore.set(
      RECOVERY_COOKIE,
      latestSession.refresh_token,
      recoveryCookieOptions()
    );
    return wrapAuthError("restablecerContrasena", updateError);
  }

  // 4. Success — sign out the ephemeral session and clean up
  await client.auth.signOut({ scope: "local" });
  cookieStore.set(RECOVERY_COOKIE, "", {
    maxAge: 0,
    path: RECOVERY_COOKIE_PATH,
    httpOnly: true,
  });
  cookieStore.delete(LAST_ACTIVITY_COOKIE);

  redirect("/auth/login?motivo=contrasena-actualizada");
}
