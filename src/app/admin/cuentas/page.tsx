import type { Metadata } from "next";
import { Calendar, Clock, Mail, RotateCcw, UserCog, X } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requerirRolPagina } from "@/lib/auth";
import { fotosDePerfil } from "@/lib/fotos-perfil";
import { logError } from "@/lib/logger";
import { formatFechaCorta } from "@/lib/fechas";
import { inicialesDePersona } from "@/lib/iniciales";
import { AvatarAjustado } from "@/components/ui/avatar-ajustado";
import { Badge } from "@/components/ui/badge";
import { EtiquetaRubro } from "@/components/ui/etiqueta-rubro";
import { EncabezadoPagina } from "@/components/ui/encabezado-pagina";
import { DialogoConfirmacion } from "@/components/ui/dialogo-confirmacion";
import { EstadoVacio, ErrorListado } from "@/components/ui/estado-listado";
import { desactivarCuenta, reactivarCuenta } from "./actions";
import { InvitarCuenta } from "./invitar-cuenta";
import { BotonVolver } from "@/components/ui/boton-volver";

export const metadata: Metadata = {
  title: "Cuentas de la oficina | Panel municipal | Portal de Empleo Funes",
};

// Acciones de la tarjeta: a todo el ancho en el celular, 40 px desde sm.
const CLASE_ACCION = "w-full shrink-0 sm:w-auto sm:min-h-10";

export default async function AdminCuentasPage() {
  const usuario = await requerirRolPagina("municipalidad");

  const supabase = await createSupabaseServerClient();
  const { data: cuentas, error } = await supabase.rpc("listar_cuentas_oficina");

  let contenido: React.ReactNode;
  if (error) {
    const ref = logError("admin_cuentas_listado", error);
    contenido = <ErrorListado refError={ref} />;
  } else if (!cuentas || cuentas.length === 0) {
    contenido = (
      <EstadoVacio tipo="sin-registros" icono={UserCog} titulo="No hay cuentas de la oficina." />
    );
  } else {
    const fotos = await fotosDePerfil(cuentas.map((c) => c.id));
    contenido = (
      <ul aria-label="Cuentas de la oficina" className="flex flex-col gap-3">
        {cuentas.map((cuenta) => {
          const esPropia = cuenta.id === usuario.id;
          const nombreCompleto = `${cuenta.nombre} ${cuenta.apellido}`.trim() || "Sin nombre";
          const foto = fotos.get(cuenta.id);
          return (
            <li
              key={cuenta.id}
              className="tarjeta tarjeta-panel flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
            >
              <div className="flex min-w-0 items-start gap-4">
                <AvatarAjustado
                  src={foto?.url}
                  ajuste={foto?.ajuste}
                  iniciales={inicialesDePersona(cuenta.nombre, cuenta.apellido)}
                  alt={`Foto de ${nombreCompleto}`}
                  size="md"
                />
                <div className="flex min-w-0 flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[17px] leading-snug font-extrabold break-words text-heading">
                      {nombreCompleto}
                    </p>
                    {esPropia && <EtiquetaRubro verde>Vos</EtiquetaRubro>}
                    <Badge tono={cuenta.activo ? "success" : "neutral"} estado>
                      {cuenta.activo ? "Activa" : "Desactivada"}
                    </Badge>
                  </div>
                  <p className="flex min-w-0 items-center gap-2 text-[15px] text-control-foreground">
                    <Mail aria-hidden="true" className="size-4 shrink-0 text-muted-icon" />
                    <span className="min-w-0 break-all">{cuenta.email}</span>
                  </p>
                  <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar aria-hidden="true" className="size-4 shrink-0 text-muted-icon" />
                      Alta: {formatFechaCorta(cuenta.creado_en)}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Clock aria-hidden="true" className="size-4 shrink-0 text-muted-icon" />
                      {cuenta.ultimo_ingreso
                        ? `Último ingreso: ${formatFechaCorta(cuenta.ultimo_ingreso)}`
                        : "Todavía no ingresó"}
                    </span>
                  </p>
                </div>
              </div>

              {esPropia ? (
                <p className="text-sm text-muted-foreground sm:max-w-56 sm:text-right">
                  No podés desactivar tu propia cuenta.
                </p>
              ) : cuenta.activo ? (
                <DialogoConfirmacion
                  textoBoton={
                    <>
                      <X className="h-4 w-4" aria-hidden="true" />
                      Desactivar
                    </>
                  }
                  estiloBoton="peligro"
                  claseBoton={CLASE_ACCION}
                  etiquetaBoton={`Desactivar la cuenta de ${nombreCompleto}`}
                  titulo={`¿Desactivar la cuenta de ${nombreCompleto}?`}
                  descripcion="No va a poder ingresar al portal y pierde el acceso en su próxima acción. Su historial (aprobaciones, cursos, derivaciones) se conserva. Podés reactivarla cuando quieras."
                  icono={X}
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
                  claseBoton={CLASE_ACCION}
                  etiquetaBoton={`Reactivar la cuenta de ${nombreCompleto}`}
                  titulo={`¿Reactivar la cuenta de ${nombreCompleto}?`}
                  descripcion="Va a poder ingresar de nuevo con su contraseña y tener los mismos permisos que el resto de la oficina."
                  icono={RotateCcw}
                  tonoIcono="primario"
                  textoConfirmar="Sí, reactivar"
                  textoPendiente="Reactivando…"
                  accion={reactivarCuenta.bind(null, cuenta.id)}
                />
              )}
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <section className="flex flex-col gap-6">
      <BotonVolver href="/admin" destacado />
      <EncabezadoPagina
        banda
        className="-mt-2"
        botonesBlancos
        titulo="Cuentas de la oficina"
        bajada="Todas las cuentas activas tienen los mismos permisos. Una cuenta desactivada no puede ingresar, pero su historial se conserva."
        acciones={<InvitarCuenta />}
      />

      {contenido}
    </section>
  );
}
