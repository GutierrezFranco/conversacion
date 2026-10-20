import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Edición Simple · Editá tus reels con IA",
  description: "Subí tu video crudo, elegí un estilo y listo. Sin editar vos y sin pagarle a un editor.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
