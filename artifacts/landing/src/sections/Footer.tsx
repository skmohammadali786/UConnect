export function Footer() {
  return (
    <footer className="border-t border-border py-8">
      <div className="container-shell flex flex-col items-center justify-between gap-3 text-sm text-muted md:flex-row">
        <p>© {new Date().getFullYear()} UConnect. All rights reserved.</p>
        <p>Your college. Your community.</p>
      </div>
    </footer>
  );
}
