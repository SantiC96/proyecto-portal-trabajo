"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

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
    return { error: error.message };
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
      data: {
        nombre: data.nombre,
        apellido: data.apellido,
        telefono: data.telefono,
        rol: "postulante",
      },
    },
  });

  if (signUpError) {
    return { error: signUpError.message };
  }

  if (!authData.user) {
    return { error: "No se pudo crear el usuario. Intentá de nuevo." };
  }

  const { error: profileError } = await supabaseAdmin
    .from("postulantes")
    .insert({ usuario_id: authData.user.id, dni: data.dni });

  if (profileError) {
    if (profileError.code === "23505") {
      return { error: "Ya existe una cuenta con ese DNI." };
    }
    return { error: "Error al crear el perfil. Intentá de nuevo." };
  }

  redirect("/auth/verificar-email");
}

export async function logout() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/auth/login");
}
