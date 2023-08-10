// Battery stage 0: ingestion. Turns unorganised text into an organised dataset
// with a loud validation report. Three input formats in v1: CSV, JSON and
// pasted table text. Nothing is silently guessed: every inference is reported.

// Parse an Indian-format number: "1,23,456.78", "Rs 12,000", "(450)", "45%".
export function parseNumber(raw) {
  if (raw == null) return { value: null, ok: false, empty: true };
  const s = String(raw).trim();
  if (s === '') return { value: null, ok: false, empty: true };
  const negative = /^\(.*\)$/.test(s);
  const pct = s.endsWith('%');
  const cleaned = s
    .replace(/[()]/g, '')
    .replace(/[%₹$€£]/g, '')
    .replace(/^(INR|Rs\.?|USD)\s*/i, '')
    .replace(/,/g, '')
    .replace(/\s/g, '');
  if (cleaned === '' || !/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(cleaned)) {
    return { value: null, ok: false, empty: false };
  }
  let v = Number(cleaned);
  if (pct) v /= 100;
  if (negative) v = -v;
  return { value: v, ok: Number.isFinite(v), empty: false };
}

// RFC 4180 style CSV state machine: quotes, escaped quotes, commas and
// newlines inside quotes, CRLF and LF line endings, BOM tolerated.
export function parseCSV(text) {
  const errors = [];
  const warnings = [];
  const src = String(text).replace(/^\uFEFF/, '');
  if (src.trim() === '') {
    return { header: [], rows: [], errors: ['The file is empty.'], warnings };
  }
  const rows = [];
  let field = '';
  let row = [];
  let inQuotes = false;
  for (let i = 0; i < src.length; i += 1) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i += 1;
      row.push(field);
      field = '';
      rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  if (inQuotes) {
    errors.push('A quoted field is never closed; the file is truncated or malformed.');
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  // drop trailing blank lines
  while (rows.length > 0 && rows[rows.length - 1].every((v) => v.trim() === '')) rows.pop();
  if (rows.length === 0) {
    return { header: [], rows: [], errors: ['No rows found.'], warnings };
  }
  const header = rows[0].map((h, i) => (h.trim() === '' ? `column_${i + 1}` : h.trim()));
  const seen = new Map();
  header.forEach((h, i) => {
    const count = (seen.get(h) || 0) + 1;
    seen.set(h, count);
    if (count > 1) header[i] = `${h} (${count})`;
  });
  const body = rows.slice(1).map((r, i) => {
    if (r.length > header.length) {
      warnings.push(`Row ${i + 2} has ${r.length} cells, expected ${header.length}; the extra cells were dropped.`);
    } else if (r.length < header.length) {
      warnings.push(`Row ${i + 2} has ${r.length} cells, expected ${header.length}; blanks were padded.`);
    }
    const out = r.slice(0, header.length).map((v) => v.trim());
    while (out.length < header.length) out.push('');
    return out;
  });
  return { header, rows: body, errors, warnings: dedupe(warnings) };
}

function dedupe(xs) {
  return [...new Set(xs)];
}

// JSON input: an array of objects, or { columns: [...], rows: [[...]] }.
export function parseJSONData(text) {
  const errors = [];
  const warnings = [];
  let data;
  try {
    data = JSON.parse(String(text));
  } catch (e) {
    return { header: [], rows: [], errors: [`Not valid JSON: ${e.message}`], warnings };
  }
  if (Array.isArray(data) && data.length > 0 && Array.isArray(data[0])) {
    // array of arrays: first row is the header
    return parseCSV(data.map((r) => r.map(csvCell).join(',')).join('\n'));
  }
  if (Array.isArray(data) && data.every((d) => d && typeof d === 'object' && !Array.isArray(d))) {
    const header = [];
    for (const d of data) {
      for (const k of Object.keys(d)) if (!header.includes(k)) header.push(k);
    }
    const rows = data.map((d) => header.map((k) => (d[k] == null ? '' : String(d[k]))));
    return { header, rows, errors, warnings };
  }
  if (data && Array.isArray(data.columns) && Array.isArray(data.rows)) {
    return { header: data.columns.map(String), rows: data.rows.map((r) => r.map((v) => (v == null ? '' : String(v)))), errors, warnings };
  }
  return {
    header: [],
    rows: [],
    errors: ['JSON must be an array of objects, an array of arrays, or { columns, rows }.'],
    warnings,
  };
}

function csvCell(v) {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// Schema detection: infer a type per column from its values and report every
// inference, missing value and unparseable cell in the validation report.
export function inferSchema(header, rows) {
  const warnings = [];
  const columns = header.map((name, idx) => {
    const raw = rows.map((r) => r[idx]);
    const nonEmpty = raw.filter((v) => v !== '');
    const parsedNumbers = nonEmpty.map(parseNumber);
    const numberish = parsedNumbers.filter((p) => p.ok).length;
    const allNumber = nonEmpty.length > 0 && numberish === nonEmpty.length;
    const distinct = new Set(nonEmpty).size;
    let type = 'text';
    if (nonEmpty.length === 0) {
      type = 'empty';
      warnings.push(`Column "${name}" is completely empty.`);
    } else if (allNumber) {
      type = 'number';
    } else if (numberish > 0 && numberish / nonEmpty.length >= 0.6) {
      type = 'mixed-number';
      warnings.push(`Column "${name}" looks numeric but ${nonEmpty.length - numberish} of ${nonEmpty.length} cells do not parse as numbers.`);
    } else if (distinct <= 12) {
      type = 'category';
    }
    const vals = allNumber ? parsedNumbers.map((p) => p.value) : null;
    return {
      name,
      type,
      total: rows.length,
      missing: rows.length - nonEmpty.length,
      distinct,
      samples: nonEmpty.slice(0, 3),
      min: vals ? Math.min(...vals) : null,
      max: vals ? Math.max(...vals) : null,
      unparseable: type === 'mixed-number' ? nonEmpty.filter((v) => !parseNumber(v).ok).slice(0, 5) : [],
    };
  });
  return { columns, warnings };
}

// The public ingestion entry point. format: 'auto' | 'csv' | 'json'.
export function ingest(text, { format = 'auto', name = 'pasted data' } = {}) {
  const errors = [];
  const warnings = [];
  const trimmed = String(text || '').trim();
  let fmt = format;
  if (fmt === 'auto') {
    fmt = trimmed.startsWith('[') || trimmed.startsWith('{') ? 'json' : 'csv';
  }
  const parsed = fmt === 'json' ? parseJSONData(text) : parseCSV(text);
  errors.push(...parsed.errors);
  warnings.push(...parsed.warnings);

  const schema = inferSchema(parsed.header, parsed.rows);
  warnings.push(...schema.warnings);

  if (parsed.rows.length === 0 && errors.length === 0) {
    errors.push('The data has a header but no rows.');
  }

  const dataset = {
    name,
    format: fmt,
    columns: parsed.header,
    rows: parsed.rows,
    rowCount: parsed.rows.length,
    columnCount: parsed.header.length,
  };
  const validation = {
    ok: errors.length === 0,
    errors: dedupe(errors),
    warnings: dedupe(warnings),
    schema: schema.columns,
    rowsParsed: parsed.rows.length,
  };
  return { dataset, validation };
}

// Column access helper for modules: returns numeric values with row indices
// for rows whose cell parsed cleanly, plus the rejects for the validation log.
export function numericColumn(dataset, columnName) {
  const idx = dataset.columns.indexOf(columnName);
  const values = [];
  const rejects = [];
  if (idx < 0) return { values, rejects, missing: true };
  dataset.rows.forEach((row, i) => {
    const cell = row[idx];
    if (cell === '') {
      rejects.push({ row: i + 2, cell, reason: 'empty' });
      return;
    }
    const p = parseNumber(cell);
    if (p.ok) values.push({ row: i + 2, value: p.value });
    else rejects.push({ row: i + 2, cell, reason: 'not a number' });
  });
  return { values, rejects, missing: false };
}
