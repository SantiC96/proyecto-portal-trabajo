-- ============================================================
-- Portal Municipal de Empleo — Migración 006
-- Ejecutar en Supabase Dashboard → SQL Editor
-- ============================================================
-- Crea el trigger que, al crear un usuario en auth.users,
-- inserta automáticamente su fila en public.usuarios.
--
-- El rol se lee de raw_user_meta_data, pero solo se acepta 'empresa';
-- cualquier otro valor se guarda como 'postulante'. El rol
-- 'municipalidad' se asigna manualmente.
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.usuarios (id, nombre, apellido, telefono, rol)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nombre',   ''),
    coalesce(new.raw_user_meta_data->>'apellido', ''),
    coalesce(new.raw_user_meta_data->>'telefono', ''),
    case
      when new.raw_user_meta_data->>'rol' = 'empresa' then 'empresa'
      else 'postulante'
    end::public.rol_usuario
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
