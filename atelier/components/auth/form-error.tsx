export function FormError({ children }: { children: string | null }) {
  if (!children) return null;
  return (
    <p
      role="alert"
      aria-live="polite"
      className="text-sm text-destructive"
    >
      {children}
    </p>
  );
}
