"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import type { Session } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseEphemeralClient } from "@/lib/supabase-ephemeral";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { traducirErrorAuth } from "@/lib/auth-errors";
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

export async function login(credentials: {
  email: string;
  password: string;
  redirectTo?: string;
}): Promise<{ error: string } | undefined> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user: existingUser },
  } = await supabase.auth.getUser();
  if (existingUser) redirect("/");

  const { error } = await supabase.auth.signInWithPassword({
    email: credentials.email,
    password: credentials.password,
  });

  if (error) {
    return { error: traducirErrorAuth(error) };
  }

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
}): Promise<{ error: string } | undefined> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user: existingUser },
  } = await supabase.auth.getUser();
  if (existingUser) redirect("/");

  const dniLimpio = data.dni.replace(/\D/g, "");
  if (dniLimpio.length < 7 || dniLimpio.length > 8) {
    return { error: "El DNI debe tener 7 u 8 números." };
  }

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

  if (signUpError) {
    return { error: traducirErrorAuth(signUpError) };
  }

  if (!authData.user) {
    return { error: "No se pudo crear el usuario. Intentá de nuevo." };
  }

  const { error: profileError } = await supabaseAdmin
    .from("postulantes")
    .insert({ usuario_id: authData.user.id, dni: dniLimpio, domicilio: data.domicilio });

  if (profileError) {
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
    if (profileError.code === "23505") {
      return { error: "Ya existe una cuenta con ese DNI." };
    }
    return { error: "Error al crear el perfil. Intentá de nuevo." };
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
}): Promise<{ error: string } | undefined> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user: existingUser },
  } = await supabase.auth.getUser();
  if (existingUser) redirect("/");

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

  if (signUpError) {
    return { error: traducirErrorAuth(signUpError) };
  }

  if (!authData.user) {
    return { error: "No se pudo crear el usuario. Intentá de nuevo." };
  }

  const { error: profileError } = await supabaseAdmin
    .from("empresas")
    .insert({
      usuario_id: authData.user.id,
      razon_social: data.razonSocial,
      cuit: data.cuit,
      rubro: data.rubro,
      descripcion: data.descripcion || null,
    });

  if (profileError) {
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
    if (profileError.code === "23505") {
      return { error: "Ya existe una empresa registrada con ese CUIT." };
    }
    return { error: "Error al crear el perfil de empresa. Intentá de nuevo." };
  }

  redirect("/auth/verificar-email-empresa");
}

export async function solicitarResetContrasena(
  formData: FormData
): Promise<void> {
  const email = formData.get("email") as string;
  const supabase = await createSupabaseServerClient();

  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/nueva-contrasena`,
  });

  // Always redirect regardless of whether the email exists (avoid account enumeration)
  redirect("/auth/reset-enviado");
}

export async function logout(formData?: FormData) {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  // Remove activity cookie so a same-session re-login doesn't find a stale timestamp
  const cookieStore = await cookies();
  cookieStore.delete(LAST_ACTIVITY_COOKIE);

  const rawTo = formData instanceof FormData
    ? (formData.get("redirectTo") as string | null)
    : null;
  redirect(rawTo ? safeRedirect(rawTo) : "/auth/login");
}

export async function restablecerContrasena(
  _prevState: { error: string; linkVencido?: boolean } | null,
  formData: FormData
): Promise<{ error: string; linkVencido?: boolean } | null> {
  const password = formData.get("password") as string;
  const confirmar = formData.get("confirmar") as string;
  const tokenHash = formData.get("token_hash") as string;

  // 1. Server-side validation — no OTP consumed yet
  if (!password || password.length < 6) {
    return { error: "La contraseña debe tener al menos 6 caracteres." };
  }
  if (password !== confirmar) {
    return { error: "Las contraseñas no coinciden." };
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
    return {
      error: "El link venció o ya fue usado. Pedí uno nuevo.",
      linkVencido: true,
    };
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
    return { error: traducirErrorAuth(updateError) };
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
