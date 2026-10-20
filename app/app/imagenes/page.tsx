import { Generator } from "@/components/Generator";
import { IMAGE_MODELS, imageCredits } from "@/lib/pricing";

export default function ImagesPage() {
  const creditTable = Object.fromEntries(
    IMAGE_MODELS.map((m) => [m.id, Object.fromEntries([1, 2, 3, 4].map((n) => [n, imageCredits(m, n)]))]),
  );
  return (
    <Generator
      kind="image"
      title="Generador de imágenes"
      placeholder="Describí la imagen que imaginás: qué se ve, estilo, luz, encuadre…"
      ideas={[
        "Miniatura de reel: persona sorprendida mirando un celular, fondo naranja, luz de estudio",
        "Foto de producto sobre mesa de madera, luz suave de ventana, fondo desenfocado",
        "Escritorio de emprendedor moderno, laptop y café, luz cálida de mañana",
        "Fondo abstracto oscuro con detalles naranjas para poner texto encima",
      ]}
      // Solo mandamos al navegador lo que se muestra: los costos internos quedan en el servidor.
      models={IMAGE_MODELS.map(({ id, name, description }) => ({ id, name, description }))}
      aspectRatios={["9:16", "1:1", "4:5", "16:9"]}
      creditTable={creditTable}
    />
  );
}
