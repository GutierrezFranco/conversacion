import type { Metadata } from "next";
import { GOOGLE_FONTS_HREF } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Edición Simple · Editá tus reels con IA",
  description: "Subí tu video crudo, elegí un estilo y listo. Sin editar vos y sin pagarle a un editor.",
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
