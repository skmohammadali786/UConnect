import { useEffect } from "react";
import Lenis from "lenis";
import { Navbar } from "@/components/Navbar";
import { Hero } from "@/sections/Hero";
import { Features } from "@/sections/Features";
import { Screenshots } from "@/sections/Screenshots";
import { HowItWorks } from "@/sections/HowItWorks";
import { CTA } from "@/sections/CTA";
import { Footer } from "@/sections/Footer";

export default function App() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const lenis = new Lenis({
      duration: 1.1,
      smoothWheel: true,
      touchMultiplier: 1.2,
    });

    let rafId = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      rafId = window.requestAnimationFrame(raf);
    };

    rafId = window.requestAnimationFrame(raf);

    return () => {
      window.cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <Screenshots />
        <HowItWorks />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
