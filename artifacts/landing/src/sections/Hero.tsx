import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

const ThreeScene = lazy(() => import("@/components/ThreeScene"));

export function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(true);
  const reducedMotion = useMemo(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  useEffect(() => {
    if (!sectionRef.current) return;
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin: "100px" },
    );
    io.observe(sectionRef.current);
    return () => io.disconnect();
  }, []);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [0, 80]);

  return (
    <section id="top" ref={sectionRef} className="relative overflow-hidden py-24 md:py-32">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,#00a86b33,transparent_45%)]" />
      <div className="container-shell grid items-center gap-10 lg:grid-cols-[1fr_1.1fr]">
        <motion.div style={{ y }} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-primary">UCONNECT</p>
          <h1 className="text-4xl font-extrabold tracking-tight md:text-6xl">Your college. Your voice.</h1>
          <p className="mt-5 max-w-xl text-lg text-muted">
            The anonymous social network for verified college students. Share freely, connect deeply.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#cta" className="rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground">Get Early Access</a>
            <a href="#features" className="rounded-xl border border-border px-6 py-3 font-semibold hover:bg-white/5">Explore Features</a>
          </div>
        </motion.div>

        <div className="hidden lg:block">
          <Suspense fallback={<div className="h-[360px] w-full rounded-3xl border border-border bg-black/10" />}>
            <ThreeScene inView={inView} reducedMotion={reducedMotion} />
          </Suspense>
        </div>
      </div>
    </section>
  );
}
