export function Field(
  props: React.InputHTMLAttributes<HTMLInputElement> & { label: string; name: string },
) {
  const { label, ...rest } = props;
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-text-secondary">{label}</span>
      <input
        {...rest}
        className="w-full rounded-xl border border-ink-600 bg-ink-800/70 px-4 py-3 text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-gold-500/60 focus:ring-2 focus:ring-gold-500/20"
      />
    </label>
  );
}
