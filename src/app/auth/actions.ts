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
import { err, errConRef, type Resultado } from "@/lib/resultado";
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
  RECOVERY_COOKIE,
  RECOVERY_COOKIE_PATH,
  recoveryCookieOptions,
} from "@/lib/session-config";

function safeRedirect(to?: string): string {
  if (to && to.startsWith("/") && !to.startsWith("//")) return to;
  return "/";
}

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

  redirect(safeRedirect(credentials.redirectTo));
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
  if (errNombre) return err("DATOS_INVALIDOS", errNombre);
  const errApellido = validarNombre(data.apellido);
  if (errApellido) return err("DATOS_INVALIDOS", errApellido);
  const errDni = validarDNI(data.dni);
  if (errDni) return err("DATOS_INVALIDOS", errDni);
  const errTelefono = validarTelefono(data.telefono);
  if (errTelefono) return err("DATOS_INVALIDOS", errTelefono);
  const errEmail = validarEmail(data.email);
  if (errEmail) return err("DATOS_INVALIDOS", errEmail);
  const errPassword = validarPassword(data.password);
  if (errPassword) return err("DATOS_INVALIDOS", errPassword);
  const errDomicilio = validarTextoOpcional(data.domicilio, LARGO_MAXIMO.domicilio);
  if (errDomicilio) return err("DATOS_INVALIDOS", `Domicilio: ${errDomicilio}`);

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
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
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
  if (errRazonSocial) return err("DATOS_INVALIDOS", errRazonSocial);
  const errCuit = validarCuitConMensaje(data.cuit);
  if (errCuit) return err("DATOS_INVALIDOS", errCuit);
  const errNombreEmp = validarNombre(data.nombre);
  if (errNombreEmp) return err("DATOS_INVALIDOS", errNombreEmp);
  const errApellidoEmp = validarNombre(data.apellido);
  if (errApellidoEmp) return err("DATOS_INVALIDOS", errApellidoEmp);
  const errTelefonoEmp = validarTelefono(data.telefono);
  if (errTelefonoEmp) return err("DATOS_INVALIDOS", errTelefonoEmp);
  const errEmailEmp = validarEmail(data.email);
  if (errEmailEmp) return err("DATOS_INVALIDOS", errEmailEmp);
  const errPasswordEmp = validarPassword(data.password);
  if (errPasswordEmp) return err("DATOS_INVALIDOS", errPasswordEmp);
  const errRubroEmp = validarTextoOpcional(data.rubro, LARGO_MAXIMO.rubro);
  if (errRubroEmp) return err("DATOS_INVALIDOS", `Rubro: ${errRubroEmp}`);
  const errDescripcionEmp = validarTextoOpcional(data.descripcion, LARGO_MAXIMO.descripcion);
  if (errDescripcionEmp) return err("DATOS_INVALIDOS", `Descripción: ${errDescripcionEmp}`);

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
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
    if (profileError.code === "23505") {
      return err("CONFLICTO", "Ya existe una empresa registrada con ese CUIT.");
    }
    const ref = logError("registrarEmpresa:profile", profileError, { userId: authData.user.id });
    return errConRef("ERROR_INTERNO", "Error al crear el perfil de empresa. Intentá de nuevo.", ref);
  }

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
  redirect(rawTo ? safeRedirect(rawTo) : "/auth/login");
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
  if (errPwd) return err("DATOS_INVALIDOS", errPwd);
  if (password !== confirmar) {
    return err("DATOS_INVALIDOS", "Las contraseñas no coinciden.");
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
