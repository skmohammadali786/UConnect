import { motion } from "framer-motion";

export function Screenshots() {
  return (
    <section id="screenshots" className="py-20">
      <div className="container-shell grid items-center gap-10 lg:grid-cols-[1fr_1fr]">
        <div>
          <h2 className="text-3xl font-bold md:text-4xl">See UConnect in action</h2>
          <p className="mt-3 max-w-xl text-muted">
            A clean, focused feed and student-first UX designed for mobile-first community interactions.
          </p>
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5 }}
          className="mx-auto w-full max-w-sm rounded-[2rem] border border-border p-3"
        >
          <img
            src="/screenshot.png"
            alt="UConnect mobile app screenshot"
            loading="lazy"
            className="w-full rounded-[1.5rem] object-cover"
          />
        </motion.div>
      </div>
    </section>
  );
}
