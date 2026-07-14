import Link from "next/link";

export default function NotFound() {
  return (
    <main className="bg-bg flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <p className="font-display text-brand text-[64px] leading-none">404</p>
      <p className="font-display text-text mt-2 text-xl italic">
        This page could not be found
      </p>
      <p className="text-text-muted mt-2 max-w-xs text-sm">
        The link may be mistyped, or the event isn’t available.
      </p>
      <Link
        href="/"
        className="border-border text-text hover:bg-card mt-6 rounded-[var(--radius-sm)] border px-4 py-2 text-sm transition"
      >
        Go home
      </Link>
    </main>
  );
}
