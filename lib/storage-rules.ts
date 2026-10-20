// Límites de almacenamiento. Lo que más ocupa son los crudos, por eso se borran solos.
export const RAW_MAX_BYTES = 1024 * 1024 * 1024; // 1 GB por crudo
export const ASSET_MAX_BYTES = 50 * 1024 * 1024; // 50 MB por recurso
export const ASSET_QUOTA_BYTES = 1024 * 1024 * 1024; // 1 GB de carpeta por usuario
export const REF_MAX_BYTES = 200 * 1024 * 1024; // 200 MB por referencia
export const RAW_RETENTION_DAYS = 30; // también para las referencias
export const REFERENCES_PER_DAY = 5;
export const OUTPUT_RETENTION_DAYS = 90;

export const RAW_EXT = /\.(mp4|mov|m4v|webm)$/i;
export const ASSET_EXT = /\.(mp4|mov|m4v|webm|png|jpe?g|webp|gif)$/i;

export function assetKind(filename: string): "image" | "video" {
  return /\.(mp4|mov|m4v|webm)$/i.test(filename) ? "video" : "image";
}

export function formatBytes(n: number): string {
  if (n >= 1024 * 1024 * 1024) return `${(n / 1024 / 1024 / 1024).toFixed(1)} GB`;
  if (n >= 1024 * 1024) return `${Math.round(n / 1024 / 1024)} MB`;
  return `${Math.max(1, Math.round(n / 1024))} KB`;
}
