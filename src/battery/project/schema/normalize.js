import { SECTOR_TEMPLATES } from './templates.js';

export function normalizeProject(raw = {}) {
  const sector = raw.sector || 'ham-road';
  const template = SECTOR_TEMPLATES[sector];
  const merged = { ...(template?.values || {}), ...raw };

  if (merged.capexCr != null && (merged.hardCostCr == null || merged.hardCostCr === 0)) {
    merged.hardCostCr = merged.capexCr;
    merged.softCostCr = 0;
    merged.contingencyPct = 0;
    // The public total has been split into hard cost; keep the normalized
    // object unambiguous so validation does not see both fields.
    merged.capexCr = null;
  }
  if (raw.constructionYears != null && raw.constructionMonths == null) {
    merged.constructionMonths = Math.round(raw.constructionYears * 12);
  }

  const months = Number(merged.constructionMonths || 0);
  const periods = Math.max(1, Math.ceil(months / 6));
  if (!Array.isArray(merged.constructionPhasing)) {
    merged.constructionPhasing = Array.from({ length: periods }, () => 1 / periods);
  }

  merged.evidence = { ...(template?.evidence || {}), ...(raw.evidence || {}) };
  return merged;
}
