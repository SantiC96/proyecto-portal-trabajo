"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { logError } from "@/lib/logger";
import { err, errConRef, fromSupabaseError, okMsg, type Resultado, type ResultadoError } from "@/lib/resultado";
import { validarOferta, type OfertaData } from "@/lib/validaciones";

async function getEmpresaAprobada(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
): Promise<{ ok: true; empresa: { id: string; razon_social: string } } | ResultadoError> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("NO_AUTENTICADO");

  const { data: empresa } = await supabase
    .from("empresas")
    .select("id, razon_social, estado_aprobacion")
    .eq("usuario_id", user.id)
    .maybeSingle();

  if (!empresa) return err("SIN_PERMISO");
  if (empresa.estado_aprobacion !== "aprobada")
    return err("SIN_PERMISO", "Tu empresa no está aprobada para publicar ofertas.");

  return { ok: true, empresa: { id: empresa.id, razon_social: empresa.razon_social } };
}

export async function crearOferta(data: OfertaData): Promise<Resultado<void>> {
  const supabase = await createSupabaseServerClient();

  const empresaResult = await getEmpresaAprobada(supabase);
  if (!empresaResult.ok) return empresaResult;
  const { empresa } = empresaResult;

  const errorValidacion = validarOferta(data);
  if (errorValidacion) return err("DATOS_INVALIDOS", errorValidacion);

  // Verificar que todas las categorías existan
  const { data: categoriasExistentes, error: errorCats } = await supabase
    .from("categorias")
    .select("id")
    .in("id", data.categorias);

  if (errorCats || !categoriasExistentes || categoriasExistentes.length !== data.categorias.length)
    return err("DATOS_INVALIDOS", "Una o más categorías no son válidas.");

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
      empresa_id: empresa.id,
      empresa_nombre: empresa.razon_social,
      estado: "pendiente_aprobacion",
      duracion_dias: data.duracionDias,
    })
    .select("id")
    .single();

  if (errorOferta || !oferta) {
    // P0001: message from trigger is user-friendly
    if (errorOferta?.code === "P0001") return fromSupabaseError(errorOferta);
    const ref = logError("crearOferta:insert", errorOferta, { empresaId: empresa.id });
    return errConRef("ERROR_INTERNO", "No se pudo crear la oferta. Intentá de nuevo.", ref);
  }

  // Insertar categorías; si falla, limpiar la oferta recién creada
  const { error: errorCatsInsert } = await supabase
    .from("oferta_categorias")
    .insert(data.categorias.map((catId) => ({ oferta_id: oferta.id, categoria_id: catId })));

  if (errorCatsInsert) {
    await supabase.from("ofertas").delete().eq("id", oferta.id);
    const ref = logError("crearOferta:categorias", errorCatsInsert, { ofertaId: oferta.id });
    return errConRef("ERROR_INTERNO", "No se pudieron guardar las categorías. Intentá de nuevo.", ref);
  }

  // Insertar vacantes
  const { error: errorVacantes } = await supabase
    .from("oferta_vacantes")
    .insert({ oferta_id: oferta.id, cantidad: data.cantidadVacantes });

  if (errorVacantes) {
    await supabase.from("ofertas").delete().eq("id", oferta.id);
    const ref = logError("crearOferta:vacantes", errorVacantes, { ofertaId: oferta.id });
    return errConRef("ERROR_INTERNO", "No se pudo guardar la cantidad de vacantes. Intentá de nuevo.", ref);
  }

  revalidatePath("/empresa/ofertas");
  revalidatePath("/ofertas");
  return okMsg("Oferta enviada a revisión.");
}

export async function editarOferta(id: string, data: OfertaData): Promise<Resultado<void>> {
  const supabase = await createSupabaseServerClient();

  const empresaResult = await getEmpresaAprobada(supabase);
  if (!empresaResult.ok) return empresaResult;
  const { empresa } = empresaResult;

  // Bloquear edición si la oferta está pendiente de revisión
  const { data: ofertaActual } = await supabase
    .from("ofertas")
    .select("id, estado")
    .eq("id", id)
    .eq("empresa_id", empresa.id)
    .maybeSingle();

  if (!ofertaActual) return err("NO_ENCONTRADO", "No se encontró la oferta o no tenés permiso para editarla.");
  if (ofertaActual.estado === "pendiente_aprobacion")
    return err("ESTADO_INVALIDO", "No podés editar una oferta que está pendiente de revisión.");

  const errorValidacion = validarOferta(data);
  if (errorValidacion) return err("DATOS_INVALIDOS", errorValidacion);

  // Validar que la nueva cantidad de vacantes no sea menor que los ya seleccionados
  const { data: contratadosData } = await supabase.rpc("contratados_en_oferta", {
    p_oferta_id: id,
  });
  const contratadosActuales = (contratadosData as number | null) ?? 0;
  if (contratadosActuales > 0 && data.cantidadVacantes < contratadosActuales) {
    return err(
      "REGLA_DE_NEGOCIO",
      `Ya tenés ${contratadosActuales} ${contratadosActuales === 1 ? "candidato seleccionado" : "candidatos seleccionados"}. La cantidad de vacantes debe ser al menos ${contratadosActuales}.`,
    );
  }

  // Verificar que todas las categorías existan
  const { data: categoriasExistentes, error: errorCats } = await supabase
    .from("categorias")
    .select("id")
    .in("id", data.categorias);

  if (errorCats || !categoriasExistentes || categoriasExistentes.length !== data.categorias.length)
    return err("DATOS_INVALIDOS", "Una o más categorías no son válidas.");

  // Actualizar la oferta (RLS verifica que sea propia y no esté cerrada).
  // El trigger prevent_empresa_oferta_campos_fn (027) detecta el cambio de
  // contenido y hace el reset de estado + limpieza de revisión en la DB;
  // no enviamos esas columnas desde acá para evitar que el trigger las
  // considere una modificación protegida.
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
      // Cambiar la duración no mueve vence_en: se usa al publicar o renovar.
      duracion_dias: data.duracionDias,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("empresa_id", empresa.id)
    .select("id");

  if (errorUpdate) {
    if (errorUpdate.code === "P0001") return fromSupabaseError(errorUpdate);
    const ref = logError("editarOferta:update", errorUpdate, { ofertaId: id });
    return errConRef("ERROR_INTERNO", "No se pudo guardar la oferta. Intentá de nuevo.", ref);
  }
  if (!actualizada || actualizada.length === 0)
    return err("NO_ENCONTRADO", "No se encontró la oferta o no tenés permiso para editarla.");

  // Reemplazar categorías
  await supabase.from("oferta_categorias").delete().eq("oferta_id", id);
  const { error: errorCatsInsert } = await supabase
    .from("oferta_categorias")
    .insert(data.categorias.map((catId) => ({ oferta_id: id, categoria_id: catId })));

  if (errorCatsInsert) {
    const ref = logError("editarOferta:categorias", errorCatsInsert, { ofertaId: id });
    return errConRef("ERROR_INTERNO", "La oferta se guardó pero no se pudieron actualizar las categorías.", ref);
  }

  // Actualizar vacantes (no cambia el estado de la oferta, tabla separada)
  const { error: errorVacantes } = await supabase
    .from("oferta_vacantes")
    .upsert({ oferta_id: id, cantidad: data.cantidadVacantes, updated_at: new Date().toISOString() });

  if (errorVacantes) {
    const ref = logError("editarOferta:vacantes", errorVacantes, { ofertaId: id });
    return errConRef("ERROR_INTERNO", "La oferta se guardó pero no se pudo actualizar la cantidad de vacantes.", ref);
  }

  revalidatePath("/empresa/ofertas");
  revalidatePath(`/empresa/ofertas/${id}/editar`);
  revalidatePath("/ofertas");
  return okMsg("Oferta guardada. Volvió a revisión de la Oficina de Empleo.");
}

export async function eliminarOferta(id: string): Promise<Resultado<void>> {
  const supabase = await createSupabaseServerClient();

  const empresaResult = await getEmpresaAprobada(supabase);
  if (!empresaResult.ok) return empresaResult;
  const { empresa } = empresaResult;

  const { data: oferta } = await supabase
    .from("ofertas")
    .select("id, estado")
    .eq("id", id)
    .eq("empresa_id", empresa.id)
    .maybeSingle();

  if (!oferta) return err("NO_ENCONTRADO", "No se encontró la oferta o no tenés permiso para eliminarla.");
  if (oferta.estado !== "pendiente_aprobacion" && oferta.estado !== "rechazada")
    return err("ESTADO_INVALIDO", "Solo podés eliminar una oferta pendiente de revisión o rechazada.");

  // Usar supabaseAdmin porque empresa no tiene SELECT en postulaciones
  const { count } = await supabaseAdmin
    .from("postulaciones")
    .select("id", { count: "exact", head: true })
    .eq("oferta_id", id);

  if (count && count > 0)
    return err("ESTADO_INVALIDO", "Esta oferta ya tiene postulaciones y no se puede eliminar.");

  const { error: errorDelete } = await supabase
    .from("ofertas")
    .delete()
    .eq("id", id)
    .eq("empresa_id", empresa.id);

  if (errorDelete) {
    const ref = logError("eliminarOferta", errorDelete, { ofertaId: id });
    return errConRef("ERROR_INTERNO", "No se pudo eliminar la oferta. Intentá de nuevo.", ref);
  }

  revalidatePath("/empresa/ofertas");
  revalidatePath("/ofertas");
  return okMsg("El envío fue eliminado.");
}

export async function cerrarOferta(id: string): Promise<Resultado<void>> {
  const supabase = await createSupabaseServerClient();

  const empresaResult = await getEmpresaAprobada(supabase);
  if (!empresaResult.ok) return empresaResult;
  const { empresa } = empresaResult;

  const { data: oferta } = await supabase
    .from("ofertas")
    .select("id, estado")
    .eq("id", id)
    .eq("empresa_id", empresa.id)
    .maybeSingle();

  if (!oferta) return err("NO_ENCONTRADO", "No se encontró la oferta o no tenés permiso para cerrarla.");
  if (oferta.estado === "cerrada") return err("ESTADO_INVALIDO", "La oferta ya está cerrada.");
  if (oferta.estado === "rechazada") return err("ESTADO_INVALIDO", "No podés cerrar una oferta rechazada.");
  if (oferta.estado !== "activa" && oferta.estado !== "pendiente_aprobacion")
    return err("ESTADO_INVALIDO", "No se puede cerrar esta oferta.");

  // Pendiente con postulaciones es el único caso de pendiente que puede cerrarse.
  if (oferta.estado === "pendiente_aprobacion") {
    const { count } = await supabaseAdmin
      .from("postulaciones")
      .select("id", { count: "exact", head: true })
      .eq("oferta_id", id);

    if (!count || count === 0)
      return err(
        "ESTADO_INVALIDO",
        "No podés cerrar una oferta pendiente sin postulaciones. Usá «Eliminar envío» para borrarla.",
      );
  }

  const { data: actualizada, error } = await supabase
    .from("ofertas")
    .update({ estado: "cerrada", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("empresa_id", empresa.id)
    .select("id");

  if (error) {
    const ref = logError("cerrarOferta", error, { ofertaId: id });
    return errConRef("ERROR_INTERNO", "No se pudo cerrar la oferta. Intentá de nuevo.", ref);
  }
  if (!actualizada || actualizada.length === 0)
    return err("ESTADO_INVALIDO", "No se encontró la oferta o ya está cerrada.");

  revalidatePath("/empresa/ofertas");
  revalidatePath("/ofertas");
  return okMsg("Oferta cerrada.");
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Renueva una oferta publicada y vencida por la misma duración, sin pasar
 * por revisión (el contenido no cambia). La función de la base verifica que
 * la oferta sea de la empresa y que esté vencida (migration_036).
 */
export async function renovarOferta(id: string): Promise<Resultado<void>> {
  const supabase = await createSupabaseServerClient();

  const empresaResult = await getEmpresaAprobada(supabase);
  if (!empresaResult.ok) return empresaResult;
  const { empresa } = empresaResult;

  if (!UUID.test(id)) return err("DATOS_INVALIDOS");

  const { data: oferta } = await supabase
    .from("ofertas")
    .select("id, estado, vence_en")
    .eq("id", id)
    .eq("empresa_id", empresa.id)
    .maybeSingle();

  if (!oferta) return err("NO_ENCONTRADO", "No se encontró la oferta o no tenés permiso para renovarla.");
  if (oferta.estado !== "activa" || !oferta.vence_en || new Date(oferta.vence_en) > new Date())
    return err("ESTADO_INVALIDO", "Solo podés renovar una oferta publicada que ya venció.");

  const { error } = await supabase.rpc("renovar_oferta", { p_oferta_id: id });

  if (error) {
    if (error.code === "P0001" || error.code === "42501") return fromSupabaseError(error);
    const ref = logError("renovarOferta", error, { ofertaId: id });
    return errConRef("ERROR_INTERNO", "No se pudo renovar la oferta. Intentá de nuevo.", ref);
  }

  revalidatePath("/empresa/ofertas");
  revalidatePath(`/empresa/ofertas/${id}`);
  revalidatePath("/empresa");
  revalidatePath("/ofertas");
  revalidatePath(`/ofertas/${id}`);
  revalidatePath("/");
  revalidatePath("/admin/ofertas");
  return okMsg("Oferta renovada. Ya se ve de nuevo en el portal.");
}
