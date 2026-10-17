import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/sora";
import "../globals.css";

export const metadata: Metadata = {
  title: { default: "Tisch6 Admin", template: "%s · Tisch6 Admin" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#0a1128" };

/** Eigenes Grundgerüst für den Adminbereich (ohne Website-Kopf und -Fuß) */
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
