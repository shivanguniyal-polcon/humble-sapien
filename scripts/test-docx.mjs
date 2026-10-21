// Quick check: does the hand-written .docx come out as a real Word file?
// Run: node scripts/test-docx.mjs
import { writeFileSync } from 'node:fs';
import { analyse } from '../src/lib/legal/pipeline.js';
import { buildDocx, docxFileName } from '../src/lib/legal/docx.js';

const text = `Section 4. The Central Government may, by notification in the Official Gazette, make rules for carrying out the purposes of this Act, provided that no such rules shall be made without prior consultation with the State Governments. Every beneficiary shall be entitled to receive the benefits in accordance with the provisions of this Act.`;

const result = analyse(text, {
  jurisdictionId: 'in-bare-act',
  source: { title: 'Sample Act', citation: 'Act No. 1 of 2024', reviewer: 'A. Reviewer' },
});

const bytes = buildDocx(result, { date: '2026-01-01T00:00:00Z' });
writeFileSync('/tmp/ths-redline.docx', bytes);
console.log('wrote', bytes.length, 'bytes to', docxFileName(result));
console.log('rows', result.rows.length, 'flags', JSON.stringify(result.summary));
