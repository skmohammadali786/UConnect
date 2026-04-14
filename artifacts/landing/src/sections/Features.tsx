import { motion } from "framer-motion";
import { Briefcase, Lock, Shield, Users } from "lucide-react";

const FEATURES = [
  { icon: Shield, title: "Post anonymously", text: "Share openly with no judgement and no social pressure." },
  { icon: Lock, title: "Verified students only", text: "Access is limited to verified college students." },
  { icon: Briefcase, title: "Internships & opportunities", text: "Discover internships and growth opportunities from peers." },
  { icon: Users, title: "Find your team", text: "Build hackathon and project teams quickly inside your campus network." },
];

export function Features() {
  return (
    <section id="features" className="py-20">
      <div className="container-shell">
        <h2 className="text-3xl font-bold md:text-4xl">Built for student communities</h2>
        <p className="mt-3 max-w-2xl text-muted">Everything you need to connect, collaborate, and speak freely on campus.</p>
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {FEATURES.map((feature, index) => (
            <motion.article
              key={feature.title}
              className="glass rounded-2xl border border-border p-6"
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.4, delay: index * 0.08 }}
            >
              <feature.icon className="h-6 w-6 text-primary" aria-hidden="true" />
              <h3 className="mt-3 text-xl font-semibold">{feature.title}</h3>
              <p className="mt-2 text-muted">{feature.text}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
