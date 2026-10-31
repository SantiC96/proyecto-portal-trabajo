import { Aviso } from "@/components/ui/aviso";

/** Debajo del texto principal de las pantallas que avisan que se mandó un correo. */
export function AvisoSpam() {
  return (
    <Aviso tono="info">
      Si no ves el correo en unos minutos, revisá la carpeta de spam o correo no deseado, y
      marcalo como «No es spam» para recibir los próximos.
    </Aviso>
  );
}
