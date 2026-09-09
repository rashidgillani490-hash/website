/**
 * Money formatting. The store operates in Pakistani Rupees. Amounts are stored
 * as plain integer rupees (PKR has no routinely-used subunit), so there is no
 * divide-by-100 here. The column names still say `*_cents` for historical
 * reasons — treat them as "minor units", which for PKR equals whole rupees.
 */

export const CURRENCY = "PKR";
export const CURRENCY_LOCALE = "en-PK";
/** PKR is a zero-decimal currency in practice. */
export const CURRENCY_FRACTION_DIGITS = 0;

const nf = new Intl.NumberFormat(CURRENCY_LOCALE, {
  style: "currency",
  currency: CURRENCY,
  currencyDisplay: "narrowSymbol",
  minimumFractionDigits: CURRENCY_FRACTION_DIGITS,
  maximumFractionDigits: CURRENCY_FRACTION_DIGITS,
});

/** e.g. formatMoney(21500) -> "Rs 21,500" */
export function formatMoney(amount: number): string {
  return nf.format(Math.round(amount || 0));
}
