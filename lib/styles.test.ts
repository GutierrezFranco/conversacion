import { test } from "node:test";
import assert from "node:assert/strict";
import { assToHex, hexToAss } from "./styles";

test("convierte colores entre la web y ffmpeg", () => {
  assert.equal(hexToAss("#FF6A1A"), "&H001A6AFF");
  assert.equal(assToHex("&H001A6AFF"), "#FF6A1A");
  assert.equal(assToHex(hexToAss("#00e1ff")), "#00E1FF");
  assert.equal(hexToAss("#000000", 0.5), "&H80000000");
  assert.equal(hexToAss("cualquier cosa"), "&H00FFFFFF");
});
