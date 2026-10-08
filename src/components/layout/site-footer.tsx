export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-gold-500/10 bg-ink-950/60">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="font-display text-lg font-bold">
            <span className="gold-text">CAT</span>SINO
          </p>
          <p className="max-w-2xl text-sm text-text-muted">
            Catsino is a free-to-play demo casino. All coins are virtual and have
            no cash value. There is no real-money gambling, deposit or withdrawal
            anywhere on this site. Play for fun only.
          </p>
          <p className="text-xs text-text-muted">
            © {new Date().getFullYear()} Catsino. A portfolio project.
          </p>
        </div>
      </div>
    </footer>
  );
}
