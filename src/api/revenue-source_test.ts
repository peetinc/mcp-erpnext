/**
 * Revenue source selection tests.
 *
 * @module lib/erpnext/tests/api/revenue-source_test
 */

import { assertEquals, assertThrows } from "@std/assert";
import { getRevenueSource } from "./revenue-source.ts";

const ENV_KEY = "ERPNEXT_REVENUE_SOURCE";

function withEnv(value: string | undefined, fn: () => void): () => void {
  return () => {
    const previous = Deno.env.get(ENV_KEY);
    if (value === undefined) Deno.env.delete(ENV_KEY);
    else Deno.env.set(ENV_KEY, value);
    try {
      fn();
    } finally {
      if (previous === undefined) Deno.env.delete(ENV_KEY);
      else Deno.env.set(ENV_KEY, previous);
    }
  };
}

Deno.test(
  "getRevenueSource - defaults to Sales Invoice",
  withEnv(undefined, () => {
    const s = getRevenueSource();
    assertEquals(s.doctype, "Sales Invoice");
    assertEquals(s.itemDoctype, "Sales Invoice Item");
    assertEquals(s.dateField, "posting_date");
  }),
);

Deno.test(
  "getRevenueSource - order selects Sales Order and transaction_date",
  withEnv("order", () => {
    const s = getRevenueSource();
    assertEquals(s.doctype, "Sales Order");
    assertEquals(s.itemDoctype, "Sales Order Item");
    assertEquals(s.dateField, "transaction_date");
  }),
);

Deno.test(
  "getRevenueSource - accepts the full doctype name",
  withEnv("Sales Order", () => {
    assertEquals(getRevenueSource().doctype, "Sales Order");
  }),
);

Deno.test(
  "getRevenueSource - is case and whitespace insensitive",
  withEnv("  INVOICE  ", () => {
    assertEquals(getRevenueSource().doctype, "Sales Invoice");
  }),
);

Deno.test(
  "getRevenueSource - throws on an unrecognised value rather than defaulting",
  withEnv("quotation", () => {
    assertThrows(
      () => getRevenueSource(),
      Error,
      'must be "invoice" or "order"',
    );
  }),
);

Deno.test(
  "getRevenueSource - date field always matches the doctype it pairs with",
  withEnv(undefined, () => {
    // Frappe matches no rows against a column the doctype lacks, so a mismatched
    // pairing returns an empty result rather than an error — the exact failure
    // this module exists to prevent.
    for (
      const [value, doctype, dateField] of [
        ["invoice", "Sales Invoice", "posting_date"],
        ["order", "Sales Order", "transaction_date"],
      ] as const
    ) {
      Deno.env.set(ENV_KEY, value);
      const s = getRevenueSource();
      assertEquals(s.doctype, doctype);
      assertEquals(s.dateField, dateField);
    }
  }),
);
