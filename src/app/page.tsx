import { Hero } from "@/components/public/hero";
import { JobDirectory } from "@/components/public/job-directory";
import { HowItWorks } from "@/components/public/how-it-works";
import { PublicFooter } from "@/components/public/public-footer";
import { getOfertasActivas, getCategorias } from "@/lib/ofertas";

export default async function HomePage() {
  const [ofertas, categorias] = await Promise.all([
    getOfertasActivas(),
    getCategorias(),
  ]);

  return (
    <>
      <main className="flex-1">
        <Hero />
        <JobDirectory ofertas={ofertas} categorias={categorias} />
        <HowItWorks />
      </main>

      <PublicFooter />
    </>
  );
}
