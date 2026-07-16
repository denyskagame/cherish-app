import QRCode from "qrcode";

// One QR per event, encoding the stable guest URL (docs/00 "one scan"). Generated
// server-side: an inline SVG for crisp on-screen display and a high-res PNG data
// URL for download/print. Cherish Noir look: light champagne-gold modules on a
// near-black field (an "inverted" code) — very high contrast (~13:1), so it scans
// well; a slightly larger quiet zone (margin 2) helps readers lock onto the
// inverted pattern. Sits inside a thin gold border in the UI.
const BASE = {
  margin: 1, // minimal quiet zone so the gold border sits close to the code
  color: { dark: "#E9D4A0", light: "#0F0F0F" },
  errorCorrectionLevel: "M" as const,
};

export async function makeQr(url: string): Promise<{ svg: string; png: string }> {
  const [svg, png] = await Promise.all([
    QRCode.toString(url, { ...BASE, type: "svg", width: 240 }),
    QRCode.toDataURL(url, { ...BASE, width: 1400 }),
  ]);
  return { svg, png };
}
