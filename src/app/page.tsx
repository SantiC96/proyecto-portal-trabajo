import { Navbar } from "@/components/public/navbar";
import { Hero } from "@/components/public/hero";
import { JobDirectory } from "@/components/public/job-directory";
import { HowItWorks } from "@/components/public/how-it-works";
import { PublicFooter } from "@/components/public/public-footer";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const session = user
    ? {
        nombre: (user.user_metadata?.nombre as string) ?? "",
        apellido: (user.user_metadata?.apellido as string) ?? "",
      }
    : null;

  return (
    <div className="flex min-h-screen flex-col bg-[#f8f8f4] text-[#1b2926]">
      {/* Main navigation header */}
      <Navbar session={session} />

      {/* Main content body */}
      <main className="flex-1">
        {/* Hero Section with CTAs and highlights */}
        <Hero />

        {/* Public Job Directory with interactive filters & mock data */}
        <JobDirectory />

        {/* Informative process breakdown & Company portal card */}
        <HowItWorks />
      </main>

      {/* Footer with institutional data and contact info */}
      <PublicFooter />
    </div>
  );
}
