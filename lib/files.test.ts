import { test } from "node:test";
import assert from "node:assert/strict";
import { inFolder } from "./files";

test("inFolder distingue crudos, recursos y reels", () => {
  assert.equal(inFolder("u1/raw/a.mp4", "raw"), true);
  assert.equal(inFolder("u1/assets/a.png", "raw"), false);
  assert.equal(inFolder("u1/j.mp4", ""), true);
  assert.equal(inFolder("u1/raw/a.mp4", ""), false);
});
