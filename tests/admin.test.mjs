import test from "node:test";
import assert from "node:assert/strict";
import { csvCell, parseCodeBatch, codeFilters, isOwnerEmail } from "../lib/admin-utils.ts";

test("admin authorization fails closed and only accepts the exact configured owner email", () => {
  assert.equal(isOwnerEmail("owner@example.com", undefined), false);
  assert.equal(isOwnerEmail("owner@example.com", ""), false);
  assert.equal(isOwnerEmail(" OWNER@example.com ", "owner@example.com"), true);
  assert.equal(isOwnerEmail("other@example.com", "owner@example.com"), false);
  assert.equal(isOwnerEmail("owner@example.com.evil", "owner@example.com"), false);
});

test("password batches reject excessive quantities and unsafe prefixes", () => {
  assert.deepEqual(parseCodeBatch({ count: 20, maxUses: 3, label: " 首发 ", prefix: "shop" }), { count: 20, maxUses: 3, label: "首发", prefix: "SHOP" });
  for (const input of [{ count: 0 }, { count: 201 }, { count: 2.5 }, { maxUses: 0 }, { maxUses: 101 }, { label: "" }, { prefix: "<script>" }, { prefix: "=1+1" }]) {
    assert.throws(() => parseCodeBatch({ count: 10, maxUses: 3, label: "测试", ...input }));
  }
});

test("CSV handles quotes and disables spreadsheet formulas in operator remarks", () => {
  assert.equal(csvCell('a,"b"'), '"a,""b"""');
  for (const text of ["=1+1", "+cmd", "@SUM(A1)", "-1+2", " =formula"]) assert.ok(csvCell(text).startsWith('"\''));
  assert.equal(csvCell("SHOP-ABCD1234"), '"SHOP-ABCD1234"');
});

test("search values are bound separately and wildcard characters are escaped", () => {
  const filters = codeFilters(new URL("https://example.com/api/admin/codes?q=" + encodeURIComponent("' OR 1=1 --%_") + "&status=available&batch=batch-1&page=2"));
  assert.ok(!filters.clause.includes("OR 1=1"));
  assert.ok(filters.values[0].includes("\\%\\_"));
  assert.equal(filters.values.at(-1), "batch-1");
  assert.equal(filters.page, 2);
  assert.throws(() => codeFilters(new URL("https://example.com?status=invalid")));
  assert.equal(codeFilters(new URL("https://example.com?page=-1")).page, 1);
});
