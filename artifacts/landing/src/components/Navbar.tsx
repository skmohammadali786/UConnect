export function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/70">
      <div className="container-shell flex h-16 items-center justify-between">
        <a href="#top" className="flex items-center gap-2 font-semibold">
          <img src="/logo-dark.png" alt="UConnect" className="h-8 w-8 rounded-md bg-white p-1" />
          <span>UConnect</span>
        </a>
        <nav className="hidden items-center gap-6 text-sm text-muted md:flex">
          <a href="#features" className="hover:text-foreground">Features</a>
          <a href="#screenshots" className="hover:text-foreground">Screenshots</a>
          <a href="#how-it-works" className="hover:text-foreground">How it works</a>
        </nav>
        <a
          href="#cta"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Get Early Access
        </a>
      </div>
    </header>
  );
}
