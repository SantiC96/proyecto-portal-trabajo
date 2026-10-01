"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { traducirErrorAuth } from "@/lib/auth-errors";

export async function login(credentials: {
  email: string;
  password: string;
}): Promise<{ error: string } | undefined> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: credentials.email,
    password: credentials.password,
  });

  if (error) {
    return { error: traducirErrorAuth(error) };
  }

  redirect("/inicio");
}

export async function registrarPostulante(data: {
  nombre: string;
  apellido: string;
  telefono: string;
  dni: string;
  email: string;
  password: string;
}): Promise<{ error: string } | undefined> {
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

  if (signUpError) {
    return { error: traducirErrorAuth(signUpError) };
  }

  if (!authData.user) {
    return { error: "No se pudo crear el usuario. Intentá de nuevo." };
  }

  const { error: profileError } = await supabaseAdmin
    .from("postulantes")
    .insert({ usuario_id: authData.user.id, dni: data.dni });

  if (profileError) {
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
    if (profileError.code === "23505") {
      return { error: "Ya existe una cuenta con ese DNI." };
    }
    return { error: "Error al crear el perfil. Intentá de nuevo." };
  }

  redirect("/auth/verificar-email");
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

export async function logout() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/auth/login");
}
