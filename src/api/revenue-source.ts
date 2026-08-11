/**
 * Revenue source selection.
 *
 * The analytics tools split on which doctype represents "revenue". Upstream
 * hardcoded Sales Order, which is correct for shops that run an order pipeline
 * and meaningless for shops that invoice directly — on an instance with zero
 * Sales Orders, every revenue chart and KPI silently returns 0 rather than
 * erroring. A green "flat" KPI reading $0 does not look broken; it looks like a
 * business that earned nothing.
 *
 * Upstream was also inconsistent with itself: `erpnext_kpi_revenue` is
 * documented as "total Sales Order revenue" while its own drill-down says
 * "Show all sales invoices for this month".
 *
 * Default here is Sales Invoice, because invoiced revenue is what the word
 * normally means and it matches those drill-downs. Set
 * `ERPNEXT_REVENUE_SOURCE=order` to restore upstream's behaviour.
 *
 * @module lib/erpnext/api/revenue-source
 */

import { env } from "../runtime.ts";

export interface RevenueSource {
  /** Parent doctype carrying the money total. */
  doctype: string;
  /** Child table doctype carrying per-line amounts. */
  itemDoctype: string;
  /**
   * Date field to filter and bucket on. Sales Invoice books on `posting_date`;
   * Sales Order uses `transaction_date`. Using the wrong one silently returns
   * nothing, since Frappe filters on a missing column match no rows.
   */
  dateField: string;
  /** Singular noun for chart titles and labels, e.g. "invoice". */
  noun: string;
  /** Plural noun for chart titles and labels, e.g. "invoices". */
  nounPlural: string;
  /** Title-case plural for chart labels and axis titles, e.g. "Invoices". */
  nounPluralTitle: string;
}

const INVOICE: RevenueSource = {
  doctype: "Sales Invoice",
  itemDoctype: "Sales Invoice Item",
  dateField: "posting_date",
  noun: "invoice",
  nounPlural: "invoices",
  nounPluralTitle: "Invoices",
};

const ORDER: RevenueSource = {
  doctype: "Sales Order",
  itemDoctype: "Sales Order Item",
  dateField: "transaction_date",
  noun: "order",
  nounPlural: "orders",
  nounPluralTitle: "Orders",
};

const ENV_KEY = "ERPNEXT_REVENUE_SOURCE";

/**
 * Resolve which doctype counts as revenue.
 *
 * `ERPNEXT_REVENUE_SOURCE` accepts "invoice" (default) or "order". Follows the
 * repo's no-silent-fallbacks policy: an unrecognised value throws rather than
 * quietly reverting to a default, since the failure mode being fixed here is
 * precisely a revenue number that is wrong without looking wrong.
 */
export function getRevenueSource(): RevenueSource {
  const raw = env(ENV_KEY)?.trim().toLowerCase();
  if (!raw) return INVOICE;

  if (raw === "invoice" || raw === "sales invoice") return INVOICE;
  if (raw === "order" || raw === "sales order") return ORDER;

  throw new Error(
    `[lib/erpnext] ${ENV_KEY} must be "invoice" or "order", got "${raw}".`,
  );
}
