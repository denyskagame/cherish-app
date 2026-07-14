import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth";
import { LoginForm } from "@/components/admin/LoginForm";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  if (await isAdminAuthenticated()) redirect("/admin");
  return (
    <main className="bg-bg flex min-h-dvh flex-col items-center justify-center px-6">
      <h1 className="font-display text-text mb-1 text-2xl">Operator Console</h1>
      <p className="text-text-muted mb-6 text-sm">Sign in to manage seating</p>
      <LoginForm />
    </main>
  );
}
