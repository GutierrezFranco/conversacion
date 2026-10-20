// Ícono de la marca: botón de play con un corte (editar video). Mismo dibujo que app/icon.svg.
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="logo-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FF9A4D" />
          <stop offset="1" stopColor="#FF5A1A" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#logo-g)" />
      <path d="M24 18.5c0-2 2.2-3.2 3.9-2.1l17.6 11.5c1.6 1 1.6 3.3 0 4.3L27.9 43.6c-1.7 1.1-3.9-.1-3.9-2.1z" fill="#fff" />
      <path d="M19 34.5 47 22" stroke="url(#logo-g)" strokeWidth="4.5" strokeLinecap="round" />
      <circle cx="48.5" cy="15.5" r="3.2" fill="#fff" opacity=".9" />
    </svg>
  );
}
