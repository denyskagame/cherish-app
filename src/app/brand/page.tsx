import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth";
import { LogoAssets } from "@/components/brand/LogoAssets";

export const dynamic = "force-dynamic";
export const metadata = { title: "Cherish — Brand assets" };

export default async function BrandPage() {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");
  return <LogoAssets />;
}
