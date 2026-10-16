// Regenera src/types/database.ts a partir del esquema real de Supabase.
//
//   npm run db:tipos
//
// Correrlo después de aplicar cada migración. Necesita SUPABASE_PROJECT_ID
// (en .env.local o en el entorno) y una sesión del CLI (`npx supabase login`).
// Escribe el archivo en UTF-8: redirigir la salida con ">" en PowerShell lo
// guarda en UTF-16 y rompe ESLint y los acentos de los enums.

import { execSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";

const DESTINO = "src/types/database.ts";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const projectId = process.env.SUPABASE_PROJECT_ID;
if (!projectId || !/^[a-z0-9]{20}$/.test(projectId)) {
  console.error(
    "Falta SUPABASE_PROJECT_ID (o no tiene el formato de un project ref). " +
      "Agregalo a .env.local; lo encontrás en la URL del proyecto en Supabase.",
  );
  process.exit(1);
}

const tipos = execSync(
  `npx supabase gen types typescript --project-id ${projectId} --schema public`,
  { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] },
);

writeFileSync(DESTINO, tipos, "utf8");
console.log(`Tipos actualizados en ${DESTINO}.`);
