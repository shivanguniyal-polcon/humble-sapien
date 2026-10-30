// CSV text, encoded for a spreadsheet consumer.
//
// Quoting a field is a CSV syntax measure. It does not stop Excel or
// LibreOffice from reading the decoded cell as a formula. A cell beginning
// with =, +, @, tab or carriage return is therefore prefixed with an
// apostrophe. A leading minus is different: -6.6 is a number, not a formula,
// so a numeric string keeps its value. Anything that starts with minus but is
// not a number is treated as hostile text.

const FORMULA_LEAD = /^[=+@\t\r]/;
const SAFE_NEGATIVE_NUMBER = /^-(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;

export const csvCell = (value) => {
  if (typeof value === 'number') return String(value);
  let text = String(value ?? '');
  const formula = FORMULA_LEAD.test(text)
    || (text.startsWith('-') && !SAFE_NEGATIVE_NUMBER.test(text));
  if (formula) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

// Object rows to a CSV document, using the first row's keys as the header.
export const toCsv = (rows) => {
  if (!rows || rows.length === 0) return '';
  const columns = Object.keys(rows[0]);
  return [
    columns.join(','),
    ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(',')),
  ].join('\n');
};
