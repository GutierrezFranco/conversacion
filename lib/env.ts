// Lee variables de entorno obligatorias con un error claro si falta alguna.
export function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Falta la variable de entorno ${name}. Mirá .env.example.`);
  return value;
}

export function appUrl(): string {
  return env("NEXT_PUBLIC_APP_URL").replace(/\/$/, "");
}
