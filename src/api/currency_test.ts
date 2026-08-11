/**
 * Default currency resolution tests.
 *
 * @module lib/erpnext/tests/api/currency_test
 */

// deno-lint-ignore-file no-explicit-any

import { assertEquals, assertRejects } from "@std/assert";
import type { FrappeClient } from "./frappe-client.ts";
import { getDefaultCurrency, resetDefaultCurrencyCache } from "./currency.ts";

const ENV_KEY = "ERPNEXT_CURRENCY";

function mockClient(listImpl: () => Promise<any[]>): FrappeClient {
  return { list: listImpl } as unknown as FrappeClient;
}

function withCleanEnv(fn: () => Promise<void>): () => Promise<void> {
  return async () => {
    const previous = Deno.env.get(ENV_KEY);
    Deno.env.delete(ENV_KEY);
    resetDefaultCurrencyCache();
    try {
      await fn();
    } finally {
      if (previous === undefined) Deno.env.delete(ENV_KEY);
      else Deno.env.set(ENV_KEY, previous);
      resetDefaultCurrencyCache();
    }
  };
}

Deno.test(
  "getDefaultCurrency - resolves from the Company doctype",
  withCleanEnv(async () => {
    const client = mockClient(async () => [{ default_currency: "USD" }]);
    assertEquals(await getDefaultCurrency(client), "USD");
  }),
);

Deno.test(
  "getDefaultCurrency - ERPNEXT_CURRENCY overrides the Company lookup",
  withCleanEnv(async () => {
    Deno.env.set(ENV_KEY, "GBP");
    resetDefaultCurrencyCache();
    let called = false;
    const client = mockClient(async () => {
      called = true;
      return [{ default_currency: "USD" }];
    });
    assertEquals(await getDefaultCurrency(client), "GBP");
    assertEquals(called, false, "override must short-circuit the API call");
  }),
);

Deno.test(
  "getDefaultCurrency - memoizes, so repeat calls hit the API once",
  withCleanEnv(async () => {
    let calls = 0;
    const client = mockClient(async () => {
      calls++;
      return [{ default_currency: "USD" }];
    });
    await getDefaultCurrency(client);
    await getDefaultCurrency(client);
    await getDefaultCurrency(client);
    assertEquals(calls, 1);
  }),
);

Deno.test(
  "getDefaultCurrency - throws rather than guessing when nothing resolves",
  withCleanEnv(async () => {
    const client = mockClient(async () => []);
    await assertRejects(
      () => getDefaultCurrency(client),
      Error,
      "Could not resolve a default currency",
    );
  }),
);

Deno.test(
  "getDefaultCurrency - throws when Company exists but has no currency set",
  withCleanEnv(async () => {
    const client = mockClient(async () => [{ default_currency: null }]);
    await assertRejects(
      () => getDefaultCurrency(client),
      Error,
      "Could not resolve a default currency",
    );
  }),
);
