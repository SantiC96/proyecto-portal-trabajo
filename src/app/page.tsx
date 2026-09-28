import { Navbar } from "@/components/public/Navbar";
import { Hero } from "@/components/public/Hero";
import { JobDirectory } from "@/components/public/JobDirectory";
import { HowItWorks } from "@/components/public/HowItWorks";
import { PublicFooter } from "@/components/public/PublicFooter";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#f8f8f4] text-[#1b2926]">
      {/* Main navigation header */}
      <Navbar />

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
