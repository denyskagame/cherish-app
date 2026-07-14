"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(false);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setBusy(false);
    if (res.ok) {
      router.replace("/admin");
      router.refresh();
    } else {
      setError(true);
    }
  }

  return (
    <form onSubmit={submit} className="w-full max-w-xs">
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Admin password"
        autoComplete="current-password"
        aria-label="Admin password"
        className="border-border bg-card text-text focus:border-brand focus:ring-brand/30 w-full rounded-[var(--radius-sm)] border px-4 py-3 outline-none focus:ring-2"
      />
      <button
        type="submit"
        disabled={busy || !password}
        className="bg-brand mt-3 w-full rounded-[var(--radius-sm)] px-4 py-3 font-medium text-[#141210] disabled:opacity-50"
      >
        {busy ? "Signing in…" : "Sign in"}
      </button>
      {error && (
        <p role="status" className="text-danger mt-3 text-sm">
          Incorrect password.
        </p>
      )}
    </form>
  );
}
