const STEPS = [
  {
    title: "Verify your student identity",
    text: "Sign up with your college email to access your trusted campus network.",
  },
  {
    title: "Join conversations anonymously",
    text: "Post and respond with confidence while keeping control of your identity.",
  },
  {
    title: "Discover opportunities",
    text: "Find internships, events, notes, and teammates from your college community.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20">
      <div className="container-shell">
        <h2 className="text-3xl font-bold md:text-4xl">How it works</h2>
        <ol className="mt-8 grid gap-4 md:grid-cols-3">
          {STEPS.map((step, idx) => (
            <li key={step.title} className="rounded-2xl border border-border bg-card/70 p-6">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                {idx + 1}
              </span>
              <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
              <p className="mt-2 text-muted">{step.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
