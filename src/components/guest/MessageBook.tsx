"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { BookHeart, Check } from "lucide-react";
import { useLocale, useT } from "@/lib/i18n/client";
import type { I18nKey } from "@/lib/i18n/dictionaries";
import { HANDWRITING_FONTS, getFont } from "@/lib/fonts";
import { Flourish, Rings } from "./ornaments";

interface BookMessage {
  id: string;
  guestName: string;
  bodyText: string;
  fontId: string;
  createdAt: string;
}

// The message book (docs/03 §8): two tabs — Write (a message live-rendered in a
// chosen handwriting font) and The Book (an infinite-scroll keepsake where each
// page is set in its own hand). AI enhancement is deferred; this is the write +
// read + moderated-submit core.
export function MessageBook({ slug }: { slug: string }) {
  const t = useT();
  const locale = useLocale();
  const [tab, setTab] = useState<"write" | "book">("write");

  return (
    <div className="mx-auto w-full max-w-app px-4">
      <header className="mb-6 text-center">
        <Rings size={26} />
        <h1 className="gold-foil font-display mt-3 text-[30px] leading-tight">
          {t("book.title")}
        </h1>
        <p className="font-display text-text-muted mt-1 text-[13px] italic">
          {t("book.subtitle")}
        </p>
        <Flourish className="mt-4" />
      </header>

      {/* Tabs */}
      <div className="border-border bg-card mx-auto mb-6 flex max-w-xs overflow-hidden rounded-full border p-1 text-sm">
        {(["write", "book"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            aria-pressed={tab === k}
            className={
              "flex-1 rounded-full py-1.5 font-medium transition " +
              (tab === k
                ? "bg-brand text-[#141210]"
                : "text-text-muted hover:text-text")
            }
          >
            {t(k === "write" ? "book.write" : "book.read")}
          </button>
        ))}
      </div>

      {tab === "write" ? (
        <WriteTab slug={slug} locale={locale} onPosted={() => setTab("book")} />
      ) : (
        <BookTab slug={slug} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function WriteTab({
  slug,
  locale,
  onPosted,
}: {
  slug: string;
  locale: "en" | "fr";
  onPosted: () => void;
}) {
  const t = useT();
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [fontId, setFontId] = useState<string>(HANDWRITING_FONTS[0].id);
  const [website, setWebsite] = useState(""); // honeypot
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<I18nKey | null>(null);
  const [notice, setNotice] = useState<I18nKey | null>(null);

  const font = getFont(fontId);

  async function submit() {
    setError(null);
    setNotice(null);
    if (!name.trim()) return setError("book.nameRequired");
    if (text.trim().length < 3) return setError("book.tooShort");

    setSubmitting(true);
    try {
      const res = await fetch(`/api/events/${slug}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestName: name.trim(),
          text: text.trim(),
          fontId,
          locale,
          wasAiEnhanced: false,
          website,
        }),
      });
      if (res.status === 429) return setError("book.tooMany");
      if (!res.ok) return setError("book.failed");
      const data = await res.json();
      setName("");
      setText("");
      if (data.moderated) {
        setNotice("book.moderated");
      } else {
        onPosted();
      }
    } catch {
      setError("book.failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (notice) {
    return (
      <div className="card-surface fade-up flex flex-col items-center gap-3 py-10 text-center">
        <span className="border-brand/40 bg-brand/10 text-brand grid h-12 w-12 place-items-center rounded-full border">
          <Check size={22} />
        </span>
        <p className="text-text max-w-[32ch] text-sm">{t(notice)}</p>
        <button
          onClick={() => setNotice(null)}
          className="border-border text-text-muted hover:text-text hover:border-brand/50 mt-1 rounded-full border px-4 py-2 text-sm transition"
        >
          {t("book.write")}
        </button>
      </div>
    );
  }

  return (
    <div className="fade-up">
      {/* The book page — an open ivory leaf you write on, in your chosen hand */}
      <div
        className="relative overflow-hidden rounded-[14px] px-6 pt-4 pb-5"
        style={{
          background: "linear-gradient(180deg,#F7F1E6 0%,#F1E8D6 100%)",
          boxShadow:
            "0 12px 34px rgba(0,0,0,.5), inset 0 0 0 1px rgba(168,130,58,.28), inset 0 0 44px rgba(120,90,40,.05)",
        }}
      >
        {/* top flourish */}
        <div className="mb-3 flex items-center justify-center gap-2" aria-hidden>
          <span style={{ height: 1, width: 40, background: "rgba(168,130,58,.45)" }} />
          <svg width="7" height="7" viewBox="0 0 7 7">
            <path d="M3.5 0 7 3.5 3.5 7 0 3.5Z" fill="#A8823A" fillOpacity=".85" />
          </svg>
          <span style={{ height: 1, width: 40, background: "rgba(168,130,58,.45)" }} />
        </div>

        {/* ruled writing area, live-rendered in the chosen handwriting */}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("book.yourMessage")}
          rows={4}
          maxLength={600}
          style={{
            fontFamily: font.family,
            fontSize: font.size,
            fontWeight: font.weight,
            lineHeight: "34px",
            color: "#332E26",
            minHeight: 136,
            paddingTop: 4,
            backgroundImage:
              "repeating-linear-gradient(transparent 0 33px, rgba(120,90,40,.16) 33px 34px)",
            backgroundAttachment: "local",
          }}
          className="block w-full resize-none bg-transparent outline-none placeholder:text-[#b0a48c]"
        />

        {/* signature line — your name, in the same hand */}
        <div className="mt-3 flex items-baseline justify-end gap-2">
          <span
            style={{ fontFamily: "'Fraunces',serif", fontStyle: "italic", color: "#A8823A" }}
            className="text-lg"
          >
            —
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("book.yourName")}
            style={{
              fontFamily: font.family,
              fontSize: 20,
              color: "#332E26",
              borderBottom: "1px solid rgba(168,130,58,.45)",
            }}
            className="min-w-0 max-w-[62%] bg-transparent px-1 pb-0.5 text-right outline-none placeholder:text-[#b0a48c]"
          />
        </div>

        <span
          className="mt-1 block text-right text-[10px]"
          style={{ color: "#a2977f" }}
        >
          {text.length}/600
        </span>
      </div>

      {/* Font picker — each label set in its own face */}
      <div className="mt-5">
        <p className="text-text-muted mb-2 text-[11px] tracking-[0.14em] uppercase">
          {t("book.style")}
        </p>
        <div className="flex flex-wrap gap-2">
          {HANDWRITING_FONTS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFontId(f.id)}
              aria-pressed={fontId === f.id}
              style={{ fontFamily: f.family }}
              className={
                "rounded-[var(--radius-sm)] border px-3 py-1.5 text-[17px] leading-none transition " +
                (fontId === f.id
                  ? "border-brand/60 bg-brand/10 text-brand"
                  : "border-border text-text hover:border-brand/40")
              }
            >
              {f.label[locale]}
            </button>
          ))}
        </div>
      </div>

      {/* Honeypot — visually hidden, off-screen; bots fill it, humans don't. */}
      <input
        type="text"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        className="absolute left-[-9999px] h-0 w-0 opacity-0"
      />

      {error && <p className="text-danger mt-3 text-xs">{t(error)}</p>}

      <button
        onClick={submit}
        disabled={submitting}
        className="bg-brand mt-4 w-full rounded-[var(--radius-sm)] py-2.5 text-sm font-medium text-[#141210] transition hover:brightness-110 disabled:opacity-50"
      >
        {submitting ? t("book.sending") : t("book.send")}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function BookTab({ slug }: { slug: string }) {
  const t = useT();
  const [messages, setMessages] = useState<BookMessage[] | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const sentinel = useRef<HTMLDivElement | null>(null);

  const fetchPage = useCallback(
    async (
      cur: string | null,
    ): Promise<{ messages: BookMessage[]; nextCursor: string | null }> => {
      const url = new URL(`/api/events/${slug}/messages`, window.location.origin);
      if (cur) url.searchParams.set("cursor", cur);
      const res = await fetch(url);
      return res.ok ? res.json() : { messages: [], nextCursor: null };
    },
    [slug],
  );

  const loadMore = useCallback(async () => {
    if (loading || done) return;
    setLoading(true);
    try {
      const data = await fetchPage(cursor);
      setMessages((prev) => [...(prev ?? []), ...data.messages]);
      setCursor(data.nextCursor);
      if (!data.nextCursor) setDone(true);
    } catch {
      setDone(true);
    } finally {
      setLoading(false);
    }
  }, [fetchPage, cursor, loading, done]);

  // First page on mount — setState only after the fetch resolves.
  useEffect(() => {
    let alive = true;
    (async () => {
      const data = await fetchPage(null);
      if (!alive) return;
      setMessages(data.messages);
      setCursor(data.nextCursor);
      if (!data.nextCursor) setDone(true);
    })();
    return () => {
      alive = false;
    };
  }, [fetchPage]);

  // Infinite scroll: load the next page when the sentinel scrolls into view.
  useEffect(() => {
    const el = sentinel.current;
    if (!el || done || loading || messages === null) return;
    const io = new IntersectionObserver(
      (entries) => entries[0].isIntersecting && loadMore(),
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [done, loading, messages, loadMore]);

  if (messages === null) return <BookSkeleton />;

  if (messages.length === 0)
    return (
      <div className="text-text-muted grid place-items-center gap-3 py-14 text-center text-sm">
        <BookHeart size={26} className="text-text-muted/50" />
        {t("book.empty")}
      </div>
    );

  return (
    <div className="space-y-3.5">
      {messages.map((m) => {
        const font = getFont(m.fontId);
        return (
          <article
            key={m.id}
            className="border-border bg-card fade-up relative overflow-hidden rounded-[var(--radius)] border px-5 pt-5 pb-4 shadow-[var(--shadow-card)]"
          >
            {/* gilt top edge */}
            <span className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-brand/20 via-brand to-brand/20" />
            <p
              style={{
                fontFamily: font.family,
                fontSize: font.size,
                fontWeight: font.weight,
                lineHeight: 1.75,
              }}
              className="text-text"
            >
              {m.bodyText}
            </p>
            <p className="font-display text-brand mt-2 text-right text-sm italic">
              — {m.guestName}
            </p>
          </article>
        );
      })}

      <div ref={sentinel} className="h-8" />
      {loading && messages.length > 0 && (
        <p className="text-text-muted py-2 text-center text-xs">···</p>
      )}
    </div>
  );
}

function BookSkeleton() {
  return (
    <div className="space-y-3.5">
      {[0, 1, 2].map((i) => (
        <div key={i} className="card-surface">
          <div className="bg-button-dark h-4 w-full animate-pulse rounded" />
          <div className="bg-button-dark/60 mt-2 h-4 w-4/5 animate-pulse rounded" />
          <div className="bg-button-dark/40 mt-3 ml-auto h-3 w-24 animate-pulse rounded" />
        </div>
      ))}
    </div>
  );
}
