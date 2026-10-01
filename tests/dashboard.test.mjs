import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Jawa Tengah boundary data contains 35 named regions", async () => {
  const source = new URL("../public/kabupaten-jawa-tengah.geojson", import.meta.url);
  const data = JSON.parse(await readFile(source, "utf8"));

  assert.equal(data.type, "FeatureCollection");
  assert.equal(data.features.length, 35);
  assert.ok(data.features.every((feature) => typeof feature.properties?.KABUPATEN === "string"));
});