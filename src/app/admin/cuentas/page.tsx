import type { Metadata } from "next";
import { X, RotateCcw, UserCog } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requerirRolPagina } from "@/lib/auth";
import { fotosDePerfil } from "@/lib/fotos-perfil";
import { logError } from "@/lib/logger";
import { formatFechaCorta } from "@/lib/fechas";
import { AvatarAjustado } from "@/components/ui/avatar-ajustado";
import { Badge } from "@/components/ui/badge";
import { EtiquetaRubro } from "@/components/ui/etiqueta-rubro";
import { BotonVolver } from "@/components/ui/boton-volver";
import { DialogoConfirmacion } from "@/components/ui/dialogo-confirmacion";
import { EstadoVacio, ErrorListado } from "@/components/ui/estado-listado";
import { desactivarCuenta, reactivarCuenta } from "./actions";
import { InvitarCuenta } from "./invitar-cuenta";

export const metadata: Metadata = {
  title: "Cuentas de la oficina | Panel municipal | Portal de Empleo Funes",
};

export default async function AdminCuentasPage() {
  const usuario = await requerirRolPagina("municipalidad");

  const supabase = await createSupabaseServerClient();
  const { data: cuentas, error } = await supabase.rpc("listar_cuentas_oficina");

  let contenido: React.ReactNode;
  if (error) {
    const ref = logError("admin_cuentas_listado", error);
    contenido = <ErrorListado className="mt-6" refError={ref} />;
  } else if (!cuentas || cuentas.length === 0) {
    contenido = (
      <EstadoVacio
        tipo="sin-registros"
        className="mt-6"
        icono={UserCog}
        titulo="No hay cuentas de la oficina."
      />
    );
  } else {
    const fotos = await fotosDePerfil(cuentas.map((c) => c.id));
    contenido = (
      <ul className="mt-6 space-y-3">
        {cuentas.map((cuenta) => {
          const esPropia = cuenta.id === usuario.id;
          const nombreCompleto = `${cuenta.nombre} ${cuenta.apellido}`.trim() || "Sin nombre";
          const foto = fotos.get(cuenta.id);
          return (
            <li
              key={cuenta.id}
              className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-center gap-3">
                <AvatarAjustado
                  src={foto?.url}
                  ajuste={foto?.ajuste}
                  alt={`Foto de ${nombreCompleto}`}
                  size="md"
                />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="break-words font-semibold text-foreground">{nombreCompleto}</p>
                    {esPropia && <EtiquetaRubro verde>Vos</EtiquetaRubro>}
                    <Badge tono={cuenta.activo ? "success" : "neutral"} estado>
                      {cuenta.activo ? "Activa" : "Desactivada"}
                    </Badge>
                  </div>
                  <p className="break-all text-sm text-muted-foreground">{cuenta.email}</p>
                  <p className="mt-0.5 text-xs text-muted-icon">
                    Alta: {formatFechaCorta(cuenta.creado_en)} ·{" "}
                    {cuenta.ultimo_ingreso
                      ? `Último ingreso: ${formatFechaCorta(cuenta.ultimo_ingreso)}`
                      : "Todavía no ingresó"}
                  </p>
                </div>
              </div>

              {!esPropia &&
                (cuenta.activo ? (
                  <DialogoConfirmacion
                    textoBoton={
                      <>
                        <X className="h-4 w-4" aria-hidden="true" />
                        Desactivar
                      </>
                    }
                    estiloBoton="peligro"
                    claseBoton="shrink-0 sm:min-h-9"
                    titulo={`¿Desactivar la cuenta de ${nombreCompleto}?`}
                    descripcion="No va a poder ingresar al portal y pierde el acceso en su próxima acción. Su historial (aprobaciones, cursos, derivaciones) se conserva. Podés reactivarla cuando quieras."
                    textoConfirmar="Sí, desactivar"
                    textoPendiente="Desactivando…"
                    destructivo
                    accion={desactivarCuenta.bind(null, cuenta.id)}
                  />
                ) : (
                  <DialogoConfirmacion
                    textoBoton={
                      <>
                        <RotateCcw className="h-4 w-4" aria-hidden="true" />
                        Reactivar
                      </>
                    }
                    claseBoton="shrink-0 sm:min-h-9"
                    titulo={`¿Reactivar la cuenta de ${nombreCompleto}?`}
                    descripcion="Va a poder ingresar de nuevo con su contraseña y tener los mismos permisos que el resto de la oficina."
                    textoConfirmar="Sí, reactivar"
                    textoPendiente="Reactivando…"
                    accion={reactivarCuenta.bind(null, cuenta.id)}
                  />
                ))}
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <section>
      <BotonVolver href="/admin" />

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Cuentas de la oficina
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Todas las cuentas activas tienen los mismos permisos. Una cuenta desactivada no
            puede ingresar, pero su historial se conserva.
          </p>
        </div>
        <InvitarCuenta />
      </div>

      {contenido}
    </section>
  );
}
