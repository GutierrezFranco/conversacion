import type { MetadataRoute } from "next";

// Permite instalar Edición Simple en el celular como una app ("Agregar a pantalla de inicio").
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Edición Simple",
    short_name: "Edición Simple",
    description: "Tus reels editados, sin editar vos.",
    start_url: "/app",
    display: "standalone",
    background_color: "#0b0a0f",
    theme_color: "#0b0a0f",
    lang: "es-AR",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
