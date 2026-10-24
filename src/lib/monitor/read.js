// Reading one instrument.
//
// The browser and the fetcher must read an instrument the same way, or the
// library and the paste panel would disagree about what a duty is. This is
// the one implementation: a hash over the text, one row per duty sentence,
// the sentence kept so the row can be checked, and the clause and bearer
// tags the rest of the page relies on.

import { analyse } from '../legal/pipeline.js';
import { bearerTag, classifyObligation, isDutyTrigger } from '../legal/obligations.js';
import { hashText } from '../legal/exports.js';

const tidy = (text) => String(text || '').replace(/\s+/g, ' ').trim();

export const instrumentFromText = async ({
  title, refNo, text, date, sourceUrl = '', id = 'paste',
}) => {
  const body = String(text || '').trim();
  if (!body) throw new Error('empty');
  const { hash } = await hashText(body);
  const { rows } = analyse(body, { mode: 'citizen', jurisdictionId: 'in-bare-act' });
  const bySource = new Map();
  for (const row of rows) if (!bySource.has(row.sourceId)) bySource.set(row.sourceId, row);
  const sentences = {};
  const duties = [];
  for (const row of [...bySource.values()].sort((a, b) => a.sourceId - b.sourceId)) {
    const quote = tidy(row.sourceText);
    if (quote.split(/\s+/).filter(Boolean).length < 6) continue;
    if (!isDutyTrigger(quote)) continue;
    const prev = tidy(bySource.get(row.sourceId - 1)?.sourceText);
    const cls = classifyObligation(quote, { prev });
    // A naming clause and a definition trigger on "shall" without asking
    // anyone to do anything.
    if (cls.type === 'meta' || cls.type === 'definition') continue;
    sentences[row.sourceId] = quote;
    if (prev) sentences[row.sourceId - 1] = prev;
    duties.push({
      id: duties.length + 1,
      sourceId: row.sourceId,
      quote,
      clause: row.clause || null,
      plain: String(row.plain || row.fullPlain || quote).trim(),
      type: cls.type,
      typeLabel: row.typeLabel || cls.type,
      bearer: bearerTag(quote),
      numbers: [...new Set((quote.match(/\b\d[\d,.]*[A-Za-z]*\b/g) || []).map((n) => n.replace(/,/g, '')))],
    });
  }
  return {
    id,
    title: String(title || '').trim() || 'Untitled instrument',
    refNo: String(refNo || '').trim() || 'no reference',
    date: String(date || '').trim() || new Date().toISOString().slice(0, 10),
    sourceUrl,
    addressee: '',
    hash: `sha256:${hash}`,
    text: body,
    sentences,
    duties,
  };
};
