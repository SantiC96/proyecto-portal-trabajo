"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { validarOferta, type OfertaData } from "@/lib/validaciones";

type ActionResult = { error?: string; exito?: boolean };

async function getEmpresaAprobada(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado." as string };

  const { data: empresa } = await supabase
    .from("empresas")
    .select("id, razon_social, estado_aprobacion")
    .eq("usuario_id", user.id)
    .maybeSingle();

  if (!empresa) return { error: "No se encontró la empresa." as string };
  if (empresa.estado_aprobacion !== "aprobada")
    return { error: "Tu empresa no está aprobada para publicar ofertas." as string };

  return { empresa };
}

export async function crearOferta(data: OfertaData): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();

  const empresaResult = await getEmpresaAprobada(supabase);
  if (empresaResult.error) return { error: empresaResult.error };
  const { empresa } = empresaResult;

  const errorValidacion = validarOferta(data);
  if (errorValidacion) return { error: errorValidacion };

  // Verificar que todas las categorías existan
  const { data: categoriasExistentes, error: errorCats } = await supabase
    .from("categorias")
    .select("id")
    .in("id", data.categorias);

  if (errorCats || !categoriasExistentes || categoriasExistentes.length !== data.categorias.length)
    return { error: "Una o más categorías no son válidas." };

  // Insertar la oferta
  const { data: oferta, error: errorOferta } = await supabase
    .from("ofertas")
    .insert({
      titulo: data.titulo.trim(),
      descripcion: data.descripcion.trim(),
      ubicacion: "Funes, Santa Fe",
      modalidad: data.modalidad,
      jornada: data.jornada,
      requisitos: data.requisitos.map((r) => r.trim()).filter(Boolean),
      beneficios: data.beneficios.map((b) => b.trim()).filter(Boolean),
      empresa_id: empresa!.id,
      empresa_nombre: empresa!.razon_social,
      estado: "pendiente_aprobacion",
    })
    .select("id")
    .single();

  if (errorOferta || !oferta) {
    console.error("[crearOferta] error al insertar oferta", errorOferta);
    return { error: "No se pudo crear la oferta. Intentá de nuevo." };
  }

  // Insertar categorías; si falla, limpiar la oferta recién creada
  const { error: errorCatsInsert } = await supabase
    .from("oferta_categorias")
    .insert(data.categorias.map((catId) => ({ oferta_id: oferta.id, categoria_id: catId })));

  if (errorCatsInsert) {
    console.error("[crearOferta] error al insertar categorías, revirtiendo oferta", errorCatsInsert);
    await supabase.from("ofertas").delete().eq("id", oferta.id);
    return { error: "No se pudieron guardar las categorías. Intentá de nuevo." };
  }

  revalidatePath("/empresa/ofertas");
  revalidatePath("/ofertas");
  return { exito: true };
}

export async function editarOferta(id: string, data: OfertaData): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();

  const empresaResult = await getEmpresaAprobada(supabase);
  if (empresaResult.error) return { error: empresaResult.error };
  const { empresa } = empresaResult;

  // Bloquear edición si la oferta está pendiente de revisión
  const { data: ofertaActual } = await supabase
    .from("ofertas")
    .select("id, estado")
    .eq("id", id)
    .eq("empresa_id", empresa!.id)
    .maybeSingle();

  if (!ofertaActual) return { error: "No se encontró la oferta o no tenés permiso para editarla." };
  if (ofertaActual.estado === "pendiente_aprobacion")
    return { error: "No podés editar una oferta que está pendiente de revisión." };

  const errorValidacion = validarOferta(data);
  if (errorValidacion) return { error: errorValidacion };

  // Verificar que todas las categorías existan
  const { data: categoriasExistentes, error: errorCats } = await supabase
    .from("categorias")
    .select("id")
    .in("id", data.categorias);

  if (errorCats || !categoriasExistentes || categoriasExistentes.length !== data.categorias.length)
    return { error: "Una o más categorías no son válidas." };

  // Actualizar la oferta (RLS verifica que sea propia y no esté cerrada)
  const { data: actualizada, error: errorUpdate } = await supabase
    .from("ofertas")
    .update({
      titulo: data.titulo.trim(),
      descripcion: data.descripcion.trim(),
      ubicacion: "Funes, Santa Fe",
      modalidad: data.modalidad,
      jornada: data.jornada,
      requisitos: data.requisitos.map((r) => r.trim()).filter(Boolean),
      beneficios: data.beneficios.map((b) => b.trim()).filter(Boolean),
      estado: "pendiente_aprobacion",
      motivo_rechazo: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("empresa_id", empresa!.id)
    .select("id");

  if (errorUpdate) {
    console.error("[editarOferta] error al actualizar", errorUpdate);
    return { error: "No se pudo guardar la oferta. Intentá de nuevo." };
  }
  if (!actualizada || actualizada.length === 0)
    return { error: "No se encontró la oferta o no tenés permiso para editarla." };

  // Reemplazar categorías
  await supabase.from("oferta_categorias").delete().eq("oferta_id", id);
  const { error: errorCatsInsert } = await supabase
    .from("oferta_categorias")
    .insert(data.categorias.map((catId) => ({ oferta_id: id, categoria_id: catId })));

  if (errorCatsInsert) {
    console.error("[editarOferta] error al actualizar categorías", errorCatsInsert);
    return { error: "La oferta se guardó pero no se pudieron actualizar las categorías." };
  }

  revalidatePath("/empresa/ofertas");
  revalidatePath(`/empresa/ofertas/${id}/editar`);
  revalidatePath("/ofertas");
  return { exito: true };
}

export async function eliminarOferta(id: string): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();

  const empresaResult = await getEmpresaAprobada(supabase);
  if (empresaResult.error) return { error: empresaResult.error };
  const { empresa } = empresaResult;

  const { data: oferta } = await supabase
    .from("ofertas")
    .select("id, estado")
    .eq("id", id)
    .eq("empresa_id", empresa!.id)
    .maybeSingle();

  if (!oferta) return { error: "No se encontró la oferta o no tenés permiso para eliminarla." };
  if (oferta.estado !== "pendiente_aprobacion" && oferta.estado !== "rechazada")
    return { error: "Solo podés eliminar una oferta pendiente de revisión o rechazada." };

  // Usar supabaseAdmin porque empresa no tiene SELECT en postulaciones
  const { count } = await supabaseAdmin
    .from("postulaciones")
    .select("id", { count: "exact", head: true })
    .eq("oferta_id", id);

  if (count && count > 0)
    return { error: "Esta oferta ya tiene postulaciones y no se puede eliminar." };

  const { error: errorDelete } = await supabase
    .from("ofertas")
    .delete()
    .eq("id", id)
    .eq("empresa_id", empresa!.id);

  if (errorDelete) {
    console.error("[eliminarOferta] error al eliminar", errorDelete);
    return { error: "No se pudo eliminar la oferta. Intentá de nuevo." };
  }

  revalidatePath("/empresa/ofertas");
  revalidatePath("/ofertas");
  redirect("/empresa/ofertas?aviso=eliminada");
}

export async function cerrarOferta(id: string): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();

  const empresaResult = await getEmpresaAprobada(supabase);
  if (empresaResult.error) return { error: empresaResult.error };
  const { empresa } = empresaResult;

  const { data: oferta } = await supabase
    .from("ofertas")
    .select("id, estado")
    .eq("id", id)
    .eq("empresa_id", empresa!.id)
    .maybeSingle();

  if (!oferta) return { error: "No se encontró la oferta o no tenés permiso para cerrarla." };
  if (oferta.estado === "cerrada") return { error: "La oferta ya está cerrada." };
  if (oferta.estado === "rechazada") return { error: "No podés cerrar una oferta rechazada." };
  if (oferta.estado !== "activa" && oferta.estado !== "pendiente_aprobacion")
    return { error: "No se puede cerrar esta oferta." };

  // Pendiente con postulaciones es el único caso de pendiente que puede cerrarse.
  if (oferta.estado === "pendiente_aprobacion") {
    const { count } = await supabaseAdmin
      .from("postulaciones")
      .select("id", { count: "exact", head: true })
      .eq("oferta_id", id);

    if (!count || count === 0)
      return {
        error:
          "No podés cerrar una oferta pendiente sin postulaciones. Usá «Eliminar envío» para borrarla.",
      };
  }

  const { data: actualizada, error } = await supabase
    .from("ofertas")
    .update({ estado: "cerrada", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("empresa_id", empresa!.id)
    .select("id");

  if (error) {
    console.error("[cerrarOferta] error al cerrar", error);
    return { error: "No se pudo cerrar la oferta. Intentá de nuevo." };
  }
  if (!actualizada || actualizada.length === 0)
    return { error: "No se encontró la oferta o ya está cerrada." };

  revalidatePath("/empresa/ofertas");
  revalidatePath("/ofertas");
  return { exito: true };
}
