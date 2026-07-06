import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cherish",
  description: "The wedding guest experience — one scan for your seat, the menu, the schedule, a message book, and photos.",
};

// Google Fonts (doc 08 B2): script display, serif editorial, sans body, and the
// five message-book handwriting faces. Loaded once here with preconnect + display=swap.
const FONTS_HREF =
  "https://fonts.googleapis.com/css2" +
  "?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400" +
  "&family=Inter:wght@400;500;600" +
  "&family=Great+Vibes&family=Dancing+Script:wght@500;700" +
  "&family=Caveat:wght@500&family=Sacramento&family=Satisfy&display=swap";

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
