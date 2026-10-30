// Text handling shared by the legal engines.
//
// Legal terms are data, not patterns. A defined term or substitution phrase
// can contain brackets, dots, plus signs or dashes, so it has to be escaped
// before it is placed inside a RegExp. Without this step, a phrase such as
// "section 4(2)" would be read as a capture group instead of a literal.

export const escapeRegExp = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
