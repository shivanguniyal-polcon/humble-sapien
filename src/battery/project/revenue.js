// Annual revenue in crore rupees. HAM uses the level annuity supplied in the
// input. Solar uses nameplate capacity, CUF, degradation and tariff; the
// 1e7 divisor converts rupees to crore.

export function annualRevenueFor(input, year) {
  if (input.sector === 'solar') {
    const capacityMw = Number(input.capacity);
    const cuf = Number(input.cufPct) / 100;
    const degradation = Number(input.degradationPct) / 100;
    const tariff = Number(input.tariff);
    const tariffEscalation = Number(input.tariffEscalationPct || 0) / 100;
    const kWh = capacityMw * 1000 * 8760 * cuf * Math.pow(1 - degradation, year - 1);
    return (kWh * tariff * Math.pow(1 + tariffEscalation, year - 1)) / 1e7;
  }
  return Number(input.annualRevenueCr)
    * Math.pow(1 + Number(input.revenueEscalationPct) / 100, year - 1);
}
