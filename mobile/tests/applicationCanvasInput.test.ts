import test from "node:test";
import assert from "node:assert/strict";
import { canvasInputNumber } from "../src/application/canvasInput.ts";
test("node input rejects ambiguous or unbounded coordinates without changing finite intended values", () => {
  assert.equal(canvasInputNumber(" -12.75 "), -12.75);
  assert.equal(canvasInputNumber("1000"), 1000);
  for (const value of [
    "",
    " ",
    "0x10",
    "1e3",
    "Infinity",
    "NaN",
    "10000001",
    "1e309",
    "12px",
  ])
    assert.throws(() => canvasInputNumber(value));
  assert.equal(canvasInputNumber("0.25", 100, true), 0.25);
  for (const value of ["0", "-1", "101"])
    assert.throws(() => canvasInputNumber(value, 100, true));
});
