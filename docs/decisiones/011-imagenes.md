# 011 — Imágenes con `next/image`

## Contexto

Las fotos de perfil se mostraban con `<img>` en cinco lugares: `Avatar`, `AvatarAjustado`, la ficha del candidato de la empresa (`/empresa/candidatos/[postulanteId]`) y las dos vistas de `FotoPerfilModal`. El logo (`public/images/logo-funes-color.png`) ya usaba `next/image`.

Las fotos están en el bucket **privado** `avatares` de Supabase y se muestran con URLs firmadas (`createSignedUrl` / `createSignedUrls`) que vencen entre 5 y 60 minutos y cambian en cada carga, porque el `token` de la query es distinto cada vez. En el perfil, antes de subir una foto nueva se muestra una vista previa con una URL local `blob:` (`URL.createObjectURL`).

---

## Decisiones tomadas

### 1. Las fotos privadas van con `unoptimized`

**Decisión:** todas las fotos de perfil (URLs firmadas y vistas previas `blob:`) se muestran con `<Image unoptimized>`, a través del componente `src/components/ui/foto-privada.tsx`. No pasan por el optimizador de imágenes (`/_next/image`).

**Razonamiento:**
- **No hay caché que aprovechar.** El optimizador guarda cada resultado usando la URL de origen como clave. Como la URL firmada cambia en cada carga, la misma foto nunca se encuentra en caché: cada vista es una transformación nueva (en Vercel, una transformación facturada) y el disco de caché se llena de copias que no se vuelven a usar.
- **Son imágenes privadas.** El optimizador guarda la imagen transformada durante `minimumCacheTTL` (o el `Cache-Control` de Supabase, el mayor de los dos) y la sirve desde `/_next/image?url=...` a quien tenga esa dirección. Eso puede extender la vida de la foto más allá del vencimiento de la URL firmada, y además la copia queda en una caché que no controlamos con RLS ni con permisos de Storage. La documentación de Next.js recomienda `unoptimized` cuando la imagen requiere autenticación.
- **Ganancia chica.** Los avatares se muestran a 32, 56 o 96 px y la subida ya limita cada foto a 2 MB (`AVATAR_MAX_SIZE` en `src/lib/archivos.ts`). Lo que se pierde (redimensionado a WebP/AVIF) es poco frente a los dos puntos anteriores.
- **Las vistas previas `blob:` no pueden optimizarse:** viven solo en el navegador del usuario. `next/image` ya las marca `unoptimized` solo, pero se deja explícito.

**Consecuencia:** con `unoptimized`, `next/image` no genera `srcset` ni usa `sizes`. Por eso los avatares usan `width`/`height` con el tamaño real en pantalla (32, 56, 96 o 280 px) en lugar de `fill` + `sizes`. Si en el futuro se optimizan imágenes públicas (por ejemplo, logos de empresas en un bucket público), ahí sí corresponde `sizes`.

Lo que sí se gana con `next/image` aunque no se optimice: `loading="lazy"` y `decoding="async"` por defecto, `width`/`height` que reservan espacio y evitan saltos de diseño, `preload` para la imagen principal de la ficha, y una sola forma de manejar errores de carga.

---

### 2. `remotePatterns` restringido al bucket `avatares`

**Decisión:** en `next.config.ts` se permite un único patrón remoto, armado con `NEXT_PUBLIC_SUPABASE_URL`:

```ts
{
  protocol: "https",                 // el de NEXT_PUBLIC_SUPABASE_URL
  hostname: "<proyecto>.supabase.co", // el de NEXT_PUBLIC_SUPABASE_URL
  port: "",                          // el de NEXT_PUBLIC_SUPABASE_URL ("" = sin puerto)
  pathname: "/storage/v1/object/sign/avatares/**",
}
```

**Razonamiento:**
- El dominio no se escribe a mano: sale de la misma variable que usa el cliente de Supabase, así cada entorno (local, preview, producción) permite solo su propio proyecto.
- Solo se habilita la ruta de URLs firmadas del bucket `avatares`. Ningún otro bucket, ruta pública ni dominio queda permitido, y no hay comodines de host.
- `search` se omite a propósito: las URLs firmadas llevan `?token=...` con un valor distinto cada vez, así que no hay un valor fijo que exigir.
- Si `NEXT_PUBLIC_SUPABASE_URL` no está definida o no es una URL `http`/`https` válida, la lista queda vacía: el build no se rompe y simplemente no se permite ningún host remoto.

Como las fotos van `unoptimized`, el navegador las pide directo a Supabase y este patrón hoy no se usa en tiempo de ejecución. Se mantiene como lista blanca: si alguien saca `unoptimized`, el optimizador solo aceptará URLs de este bucket y nunca funcionará como proxy abierto hacia otros dominios.

---

### 3. Fallback cuando la foto no carga

**Decisión:** `FotoPrivada` recibe un `fallback` y lo muestra si la imagen dispara `onError` (por ejemplo, porque la URL firmada venció mientras la página seguía abierta). Cada pantalla le pasa el mismo fallback que usa cuando no hay foto (ícono `UserRound` o `User` sobre el mismo fondo), con el mismo tamaño y forma, para que el diseño no se mueva.

**Razonamiento:**
- `onError` necesita un Client Component, así que la frontera de cliente queda en `FotoPrivada` y nada más: `Avatar`, `AvatarAjustado` y la ficha del candidato siguen siendo componentes de servidor.
- Se guarda **qué `src` falló** en lugar de un booleano: si llega una URL nueva (otra vista previa, o una URL firmada nueva tras recargar), se vuelve a intentar sin necesidad de un `useEffect`.

---

### 4. `preload` solo en la ficha del candidato

**Decisión:** la foto de la cabecera de `/empresa/candidatos/[postulanteId]` usa `preload` (en Next.js 16 reemplaza a `priority`, que quedó deprecado). Los avatares de listados, la barra de navegación y los paneles usan el `loading="lazy"` por defecto. Las dos vistas del modal usan `loading="eager"`, como el `<img>` anterior, porque solo existen cuando el usuario abre el modal.

---

## Cómo agregar una imagen nueva

- **Archivo de `public/`:** `<Image src="/images/..." width={...} height={...} alt="..." />`, optimizada (es pública y su URL es estable).
- **Foto de un bucket privado:** usar `FotoPrivada` con su `fallback`. Si es de otro bucket, agregar su ruta `/storage/v1/object/sign/<bucket>/**` a `remotePatterns` solo si se va a optimizar.
- **Imagen remota pública con URL estable:** agregar un patrón específico (host + ruta, sin comodines amplios) y usar `sizes` acorde al tamaño en pantalla.
