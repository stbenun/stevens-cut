/* Provenance classification — THE ONE COPY.
 *
 * WHY THIS FILE EXISTS. food-doc.js and status.js each carried their own hand-written
 * classifier over the same FOOD_FACTS `src` prose, and they tested in a different order.
 * The two GENERATED documents therefore disagreed about the same 121 foods:
 *
 *     STATUS.md      56 label · 36 USDA · 27 derived · 2 unverified
 *     FOOD_FACTS.md  41 label · 36 USDA · 42 derived · 2 UNVERIFIED
 *
 * Fifteen foods classified two ways, in two documents that both claim to be generated from
 * one source. That is two copies of one rule — the exact bug the whole pricing design exists
 * to delete — living inside the tooling that reports on it. Found 2026-08-28.
 *
 * A guard asserting the two docs agree would have caught it. A shared function makes it
 * impossible, which is better: this repo already prefers "one home per fact" over a check
 * that the two homes match.
 *
 * WHICH PRECEDENCE WON, AND WHY. status.js's order. The disagreement was almost entirely his
 * eleven Buffins, whose src reads "HummusFit Buffin badge, HIS OWN shipment email photographed
 * Aug 19 2026; matches the myhummusfit.com published figure exactly."
 *   - food-doc tested /matches the/ before /label/ and called them DERIVED.
 *   - status tested /his own|photographed/ first and called them LABEL.
 * A photographed badge from his own shipment IS a label. "Matches the published figure" is
 * corroboration of that label, not a derivation from something else — and reading it as
 * derivation understated how well sourced those rows actually are.
 *
 * ORDER MATTERS AND IS THE POINT. Unverified is tested first because a src that says
 * "not a label photo" or "brand unconfirmed" is NOT label-sourced, however many times it says
 * the word label. That mistake was made out loud once already.
 */

const UNVERIFIED = /not (yet )?confirmed|neither is a label|derived, not a label|needs one weigh|brand unconfirmed|brand not confirmed/;
const LABEL      = /his label|his own|photographed|label|panel|lotusbiscoff/;
const USDA       = /usda/;

/* Returns one of: 'unverified' | 'label' | 'USDA' | 'derived'.
   Callers format for display — FOOD_FACTS.md shouts UNVERIFIED on purpose, so that it is
   visible in the table; STATUS.md prints it lowercase in a summary line. */
function tag(src) {
  const t = String(src || '').toLowerCase();
  if (UNVERIFIED.test(t)) return 'unverified';
  if (LABEL.test(t)) return 'label';
  if (USDA.test(t)) return 'USDA';
  return 'derived';
}

module.exports = { tag };
