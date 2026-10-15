import { requerirRolPagina } from "@/lib/auth";

export default async function EmpresaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requerirRolPagina("empresa");

  return <>{children}</>;
}
