export function CTA() {
  return (
    <section id="cta" className="py-20">
      <div className="container-shell">
        <div className="rounded-3xl border border-primary/30 bg-primary/15 p-8 text-center md:p-12">
          <h2 className="text-3xl font-extrabold md:text-4xl">Ready to join UConnect?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted">
            Be the first to hear about launch updates and early access for your campus.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href="mailto:hello@uconnect.app?subject=UConnect%20Early%20Access"
              className="rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground"
            >
              Join Waitlist
            </a>
            <a href="#top" className="rounded-xl border border-border px-6 py-3 font-semibold">
              Back to top
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
