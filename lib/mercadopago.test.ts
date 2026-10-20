import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { verifyWebhookSignature } from "./mercadopago";

const secret = "secreto-de-prueba";

function sign(manifest: string) {
  return createHmac("sha256", secret).update(manifest).digest("hex");
}

test("acepta una firma válida", () => {
  const v1 = sign("id:123456;request-id:req-1;ts:1700000000;");
  assert.equal(
    verifyWebhookSignature({ xSignature: `ts=1700000000,v1=${v1}`, xRequestId: "req-1", dataId: "123456", secret }),
    true,
  );
});

test("rechaza una firma de otro pago", () => {
  const v1 = sign("id:999;request-id:req-1;ts:1700000000;");
  assert.equal(
    verifyWebhookSignature({ xSignature: `ts=1700000000,v1=${v1}`, xRequestId: "req-1", dataId: "123456", secret }),
    false,
  );
});

test("rechaza headers faltantes o mal formados", () => {
  assert.equal(verifyWebhookSignature({ xSignature: null, xRequestId: "r", dataId: "1", secret }), false);
  assert.equal(verifyWebhookSignature({ xSignature: "ts=1", xRequestId: "r", dataId: "1", secret }), false);
  assert.equal(verifyWebhookSignature({ xSignature: "ts=1,v1=zz", xRequestId: "r", dataId: "1", secret }), false);
});

test("usa el id en minúsculas", () => {
  const v1 = sign("id:abc123;request-id:r;ts:1;");
  assert.equal(verifyWebhookSignature({ xSignature: `ts=1,v1=${v1}`, xRequestId: "r", dataId: "ABC123", secret }), true);
});
