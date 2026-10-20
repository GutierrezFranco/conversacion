import type { Metadata, Viewport } from "next";
import { GOOGLE_FONTS_HREF } from "@/lib/fonts";
import "./globals.css";

const description = "Subís el video crudo y te lo devolvemos cortado, con subtítulos y tus fotos. Sin editar vos y sin pagarle a un editor.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: { default: "Edición Simple · Tus reels editados, sin editar vos", template: "%s · Edición Simple" },
  description,
  applicationName: "Edición Simple",
  appleWebApp: { capable: true, title: "Edición Simple", statusBarStyle: "black-translucent" },
  openGraph: { type: "website", locale: "es_AR", siteName: "Edición Simple", title: "Edición Simple · Tus reels editados, sin editar vos", description },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#0b0a0f",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* Las tipografías de los subtítulos, para que la vista previa se vea como el video final. */}
        <link rel="stylesheet" href={GOOGLE_FONTS_HREF} />
      </head>
      <body>{children}</body>
    </html>
  );
}
