"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  CalendarClock,
  Image as ImageIcon,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  Menu as MenuIcon,
  MessageSquare,
  Settings,
  UtensilsCrossed,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";

// Console chrome: a persistent left sidebar for section nav (no horizontal
// scroll), collapsing to a drawer on small screens. Sections not built yet show
// a "soon" badge so the roadmap is visible.
interface NavRow {
  label: string;
  icon: LucideIcon;
  href?: string; // undefined → "soon" (disabled)
  active: boolean;
}

/** The Cherish mark — two interlocking gold rings. */
function RingMark({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={(size * 15) / 22}
      viewBox="0 0 22 15"
      fill="none"
      aria-hidden
      className="shrink-0"
    >
      <circle cx="7.5" cy="7.5" r="5.8" stroke="#C9A96E" strokeWidth="1.4" />
      <circle cx="14.5" cy="7.5" r="5.8" stroke="#C9A96E" strokeWidth="1.4" />
    </svg>
  );
}

function Wordmark({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link href="/admin" onClick={onNavigate} className="inline-flex items-center gap-2.5">
      <RingMark />
      <span className="font-display text-text text-[19px] leading-none tracking-tight">
        Cherish
      </span>
    </Link>
  );
}

function SidebarNav({
  items,
  onLogout,
  onNavigate,
}: {
  items: NavRow[];
  onLogout: () => void;
  onNavigate?: () => void;
}) {
  const cls =
    "flex items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2 text-sm transition ";
  return (
    <div className="flex h-full flex-col">
      <div className="border-border/50 border-b px-5 py-4">
        <Wordmark onNavigate={onNavigate} />
        <p className="text-text-muted/60 mt-2 text-[9px] tracking-[0.24em] uppercase">
          Wedding console
        </p>
      </div>

      <nav className="flex-1 space-y-0.5 px-3">
        {items.map((it) =>
          it.href ? (
            <Link
              key={it.label}
              href={it.href}
              onClick={onNavigate}
              aria-current={it.active ? "page" : undefined}
              className={
                cls +
                (it.active
                  ? "bg-brand/15 text-brand font-medium"
                  : "text-text-muted hover:text-text hover:bg-button-dark")
              }
            >
              <it.icon size={17} strokeWidth={1.75} />
              <span>{it.label}</span>
            </Link>
          ) : (
            <span key={it.label} className={cls + "text-text-muted/45"} title="Coming soon">
              <it.icon size={17} strokeWidth={1.75} />
              <span className="flex-1">{it.label}</span>
              <span className="border-border rounded-full border px-1.5 py-px text-[9px] tracking-wide uppercase">
                soon
              </span>
            </span>
          ),
        )}
      </nav>

      <div className="border-border border-t p-3">
        <button
          onClick={onLogout}
          className="text-text-muted hover:text-text hover:bg-button-dark flex w-full items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2 text-sm transition"
        >
          <LogOut size={17} strokeWidth={1.75} />
          Log out
        </button>
      </div>
    </div>
  );
}

export function AdminShell({
  eventSlug,
  children,
}: {
  eventSlug: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const base = eventSlug ? `/admin/${eventSlug}` : null;
  const items: NavRow[] = [
    { label: "Dashboard", icon: LayoutDashboard, href: "/admin", exact: true },
    { label: "Guests", icon: Users, href: base ? `${base}/guests` : undefined },
    { label: "Seating", icon: LayoutGrid, href: base ? `${base}/seating` : undefined },
    { label: "Menu", icon: UtensilsCrossed },
    { label: "Schedule", icon: CalendarClock },
    { label: "Messages", icon: MessageSquare },
    { label: "Photos", icon: ImageIcon },
    { label: "Settings", icon: Settings, href: base ? `${base}/settings` : undefined },
  ].map((it) => ({
    ...it,
    active: it.href
      ? (it as { exact?: boolean }).exact
        ? pathname === it.href
        : pathname.startsWith(it.href)
      : false,
  }));

  const logout = async () => {
    await fetch("/api/admin/login", { method: "DELETE" });
    router.replace("/admin/login");
    router.refresh();
  };

  return (
    <div className="bg-bg min-h-dvh lg:flex">
      {/* Desktop sidebar */}
      <aside className="border-border bg-card sticky top-0 hidden h-dvh w-56 shrink-0 border-r lg:block">
        <SidebarNav items={items} onLogout={logout} />
      </aside>

      {/* Mobile top bar */}
      <div className="border-border bg-card sticky top-0 z-30 flex items-center gap-3 border-b px-4 py-3 lg:hidden">
        <button onClick={() => setOpen(true)} aria-label="Open menu" className="text-text-muted hover:text-text">
          <MenuIcon size={20} />
        </button>
        <Wordmark />
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="border-border bg-card absolute inset-y-0 left-0 w-64 border-r">
            <button
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="text-text-muted hover:text-text absolute top-4 right-4"
            >
              <X size={18} />
            </button>
            <SidebarNav
              items={items}
              onLogout={logout}
              onNavigate={() => setOpen(false)}
            />
          </div>
        </div>
      )}

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
