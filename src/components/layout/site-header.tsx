import { Navbar } from "@/components/public/navbar";
import type { SesionData } from "@/lib/sesion";

export function SiteHeader({ sesion }: { sesion: SesionData | null }) {
  if (!sesion) {
    return <Navbar />;
  }

  return <Navbar session={sesion} />;
}
