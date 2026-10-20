import { getFont } from "@/lib/fonts";
import { assToHex, type EditStyle } from "@/lib/styles";

// Muestra cómo se van a ver los subtítulos de un estilo, con su fuente y colores reales.
export function StylePreview({ style, text = "Así se ven tus subtítulos" }: { style: EditStyle; text?: string }) {
  const c = style.captions;
  const font = getFont(c.font);
  const color = assToHex(c.primary);
  const highlight = assToHex(c.highlight);
  const outline = assToHex(c.outline);
  const words = (c.uppercase ? text.toLocaleUpperCase("es") : text).split(" ");
  const stroke = !c.box && c.outlineWidth > 0 ? Math.max(1, Math.round(c.outlineWidth / 3)) : 0;

  return (
    <div className="style-preview">
      <span
        style={{
          fontFamily: `"${font?.css.family ?? "Poppins"}", sans-serif`,
          fontWeight: font?.css.weight ?? 700,
          fontStyle: font?.css.italic ? "italic" : "normal",
          color,
          background: c.box ? outline : "transparent",
          padding: c.box ? "2px 8px" : 0,
          borderRadius: 6,
          WebkitTextStroke: stroke ? `${stroke}px ${outline}` : undefined,
          paintOrder: "stroke fill",
        }}
      >
        {words.map((w, i) => (
          <span key={i} style={{ color: i === words.length - 1 ? highlight : undefined }}>
            {w}
            {i < words.length - 1 ? " " : ""}
          </span>
        ))}
      </span>
    </div>
  );
}
