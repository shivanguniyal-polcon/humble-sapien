// Annual fixed O&M. Tax and the operating waterfall must read the same
// escalated series; the waterfall simply takes half of this for each
// half-year period.

export function annualOpexFor(input, year) {
  return Number(input.opexFixedCrPerYear)
    * Math.pow(1 + Number(input.opexEscalationPct) / 100, year - 1);
}
