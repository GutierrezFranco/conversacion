// Corre todas las migraciones en un Postgres en memoria (PGlite) y prueba la lógica de créditos.
//   npm run test:db
// Simula lo mínimo de Supabase (auth.users, storage) que usan las migraciones.
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
const db = new PGlite();
// Lo mínimo de Supabase que usan las migraciones.
await db.exec(`
  create schema auth; create schema storage;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text);
  create function auth.uid() returns uuid language sql as $$ select null::uuid $$;
  create role anon; create role authenticated;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint);
  create table storage.objects (id uuid default gen_random_uuid(), bucket_id text, name text, created_at timestamptz default now());
  create function storage.foldername(name text) returns text[] language sql as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'),1)-1] $$;
`);
const dir = new URL("./migrations", import.meta.url).pathname;
// PGlite no trae pgcrypto (Supabase sí); gen_random_uuid() ya viene en Postgres.
for (const f of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
  await db.exec(readFileSync(`${dir}/${f}`, "utf8").replace("create extension if not exists pgcrypto;", ""));
}
const q = async (sql, p) => (await db.query(sql, p)).rows;
const [u] = await q(`insert into auth.users (email) values ('a@b.c') returning id`);
const bal = async () => (await q(`select balance from credit_balances where user_id=$1`, [u.id]))[0]?.balance;
assert.equal(await bal(), 10, "regalo de bienvenida");
const [job] = await q(`select * from create_job($1,'edit','t','{}'::jsonb,10,null)`, [u.id]);
assert.equal(await bal(), 0, "cobro de la edición");
await assert.rejects(q(`select * from create_job($1,'edit','t','{}'::jsonb,10,null)`, [u.id]), /INSUFFICIENT_CREDITS/);
await q(`select fail_job($1,'x')`, [job.id]); await q(`select fail_job($1,'x')`, [job.id]);
assert.equal(await bal(), 10, "la devolución no se duplica");
const [p] = await q(`insert into purchases (user_id,pack_id,credits,amount_ars) values ($1,'uno',10,5000) returning id`, [u.id]);
assert.equal((await q(`select approve_purchase($1,'pay1') r`, [p.id]))[0].r, true);
assert.equal((await q(`select approve_purchase($1,'pay1') r`, [p.id]))[0].r, false, "el webhook repetido no acredita dos veces");
assert.equal(await bal(), 20);
await q(`insert into promo_codes (code,credits,max_uses) values ('MDM-PRUEBA',30,1)`);
assert.equal((await q(`select redeem_promo($1,'mdm-prueba') r`, [u.id]))[0].r, 30);
await assert.rejects(q(`select redeem_promo($1,'NOEXISTE')`, [u.id]), /PROMO_INVALID/);
const [u2] = await q(`insert into auth.users (email) values ('x@y.z') returning id`);
await assert.rejects(q(`select redeem_promo($1,'MDM-PRUEBA')`, [u2.id]), /PROMO_EXHAUSTED/);
assert.equal(await bal(), 50);
const [claimed] = await q(`select * from claim_job()`);
assert.equal(claimed.id, null, "cola vacía");
await q(`insert into storage.objects (bucket_id,name,created_at) values ('uploads',$1||'/raw/a.mp4', now()-interval '40 days'),('uploads',$1||'/assets/b.png', now()-interval '40 days'),('outputs',$1||'/j.mp4', now()-interval '100 days')`, [u.id]);
assert.deepEqual((await q(`select * from expired_objects('uploads','raw',30)`)).map((r) => r.expired_objects), [`${u.id}/raw/a.mp4`], "los recursos de la carpeta no se borran");
assert.equal((await q(`select * from expired_objects('outputs','',90)`)).length, 1);
await q(`insert into promo_codes (code,credits,max_uses) values ('MULTI',5,10)`);
await q(`select redeem_promo($1,'MULTI')`, [u2.id]);
await assert.rejects(q(`select redeem_promo($1,'MULTI')`, [u2.id]), /PROMO_USED/);
assert.equal((await q(`select uses from promo_codes where code='MULTI'`))[0].uses, 1);
console.log("Migraciones y lógica de créditos: OK");
