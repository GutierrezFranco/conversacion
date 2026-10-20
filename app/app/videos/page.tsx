import { notFound } from "next/navigation";
import { AI_GENERATORS } from "@/lib/features";
import { Generator } from "@/components/Generator";
import { VIDEO_MODELS, videoCredits } from "@/lib/pricing";

export default function VideosPage() {
  if (!AI_GENERATORS) notFound();
  const creditTable = Object.fromEntries(
    VIDEO_MODELS.map((m) => [m.id, Object.fromEntries(m.durations.map((s) => [s, videoCredits(m, s)]))]),
  );
  return (
    <Generator
      kind="video"
      title="Generador de videos"
      placeholder="Describí la escena: qué se ve, cómo se mueve la cámara, la luz…"
      ideas={[
        "Toma cinematográfica de una laptop en un escritorio oscuro, luz naranja de neón, la cámara se acerca lento",
        "Timelapse de una ciudad de noche desde un rascacielos, luces que se encienden",
        "Primer plano de manos escribiendo en un teclado mecánico iluminado, profundidad de campo",
        "Persona caminando por una calle de ciudad al atardecer, cámara en mano que la sigue",
      ]}
      models={VIDEO_MODELS.map(({ id, name, description, durations }) => ({ id, name, description, durations }))}
      aspectRatios={["9:16", "1:1", "16:9"]}
      creditTable={creditTable}
    />
  );
}
