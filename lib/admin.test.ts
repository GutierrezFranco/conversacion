import { test } from "node:test";
import assert from "node:assert/strict";
import { generateCode, isAdmin } from "./admin";

test("isAdmin lee ADMIN_EMAILS sin importar mayúsculas ni espacios", () => {
  process.env.ADMIN_EMAILS = " Yo@Mail.com , otro@mail.com";
  assert.equal(isAdmin("yo@mail.com"), true);
  assert.equal(isAdmin("OTRO@mail.com"), true);
  assert.equal(isAdmin("nadie@mail.com"), false);
  assert.equal(isAdmin(undefined), false);
  process.env.ADMIN_EMAILS = "";
  assert.equal(isAdmin("yo@mail.com"), false);
});

test("los códigos son legibles y no usan caracteres confusos", () => {
  const code = generateCode();
  assert.match(code, /^ES-[A-HJKMNP-Z2-9]{6}$/);
  assert.equal(generateCode("MDM", () => 0), "MDM-AAAAAA");
});
