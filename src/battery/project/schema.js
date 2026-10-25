// Project desk input schema.
//
// One data module drives the public form, the practitioner form, the engine and
// the memo clause library. A field is described once: label, type, unit,
// default, visibility, validation and the evidence level of its preset.
//
// Conventions follow private/dcf-parameter-register.md. Nothing here should be
// treated as a forecast; defaults are benchmarks to be edited, not answers.
//
// The implementation is split by concern:
//   constants.js   tax rates, evidence levels and mode names
//   visibility.js  the only public-field allowlist
//   fields.js      field definitions and lookup helpers
//   templates.js   sector values and evidence maps
//   normalize.js   public-to-engine input conversion
//   validate.js    field and whole-case validation

export { TAX_RATES, EVIDENCE_LEVELS, MODES } from './schema/constants.js';
export { PUBLIC_FIELDS, publicFieldKeys, isPublicField } from './schema/visibility.js';
export {
  FIELD_GROUPS, FIELDS, FIELD_BY_KEY,
  fieldByKey, fieldLabel, fieldUnit, publicFields,
} from './schema/fields.js';
export {
  SECTOR_TEMPLATES, resolveTemplate, evidenceFor, buildProvenance,
} from './schema/templates.js';
export { normalizeProject } from './schema/normalize.js';
export { validateProject, validateField } from './schema/validate.js';
