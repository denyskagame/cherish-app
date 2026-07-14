import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cherish",
  description: "The wedding guest experience — one scan for your seat, the menu, the schedule, a message book, and photos.",
};

// Dark is the only theme (docs/08 §7): colour the mobile browser chrome + hint
// native UI to render dark.
export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#000000",
};

// Google Fonts (docs/08 §B2): Fraunces (display) + Instrument Sans (body) for the
// chrome, plus the five message-book handwriting faces (book-only). Loaded once
// here with preconnect + display=swap.
const FONTS_HREF =
  "https://fonts.googleapis.com/css2" +
  "?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;1,9..144,400" +
  "&family=Instrument+Sans:wght@400;500" +
  "&family=Dancing+Script:wght@500;700" +
  "&family=Caveat:wght@500&family=Sacramento&family=Great+Vibes&family=Satisfy&display=swap";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={FONTS_HREF} />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
