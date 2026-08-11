/**
 * Default currency resolution.
 *
 * Analytics and KPI payloads carry a currency code so the viewers can format
 * money. That code was hardcoded to "EUR" at 19 sites, which mislabels every
 * figure on any instance that isn't billing in euros — the numbers were right,
 * the unit was a lie.
 *
 * Resolved from the ERPNext instance instead, because the currency is
 * deployment data and does not belong in source. `ERPNEXT_CURRENCY` overrides
 * for multi-company setups where the first Company isn't the one you report in.
 *
 * @module lib/erpnext/api/currency
 */

import type { FrappeClient } from "./frappe-client.ts";
import { env } from "../runtime.ts";

let cached: string | undefined;

/** Reset the memoized currency. Tests only. */
export function resetDefaultCurrencyCache(): void {
  cached = undefined;
}

/**
 * Resolve the default currency code (e.g. "USD").
 *
 * Order: `ERPNEXT_CURRENCY` env override, then the first Company's
 * `default_currency`. Memoized for the process lifetime — a company's
 * reporting currency does not change under a running server.
 *
 * Follows the repo's no-silent-fallbacks policy: throws rather than guessing a
 * code, since a wrong currency label on a money figure is worse than an error.
 */
export async function getDefaultCurrency(
  client: FrappeClient,
): Promise<string> {
  if (cached) return cached;

  const override = env("ERPNEXT_CURRENCY")?.trim();
  if (override) {
    cached = override;
    return cached;
  }

  const rows = await client.list("Company", {
    fields: ["default_currency"],
    limit: 1,
  });
  const resolved = rows[0]?.default_currency as string | undefined;

  if (!resolved) {
    throw new Error(
      "[lib/erpnext] Could not resolve a default currency: no Company has " +
        "default_currency set. Set ERPNEXT_CURRENCY to override.",
    );
  }

  cached = resolved;
  return cached;
}
