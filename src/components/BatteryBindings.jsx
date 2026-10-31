import NumInput from './NumInput';
import { MODULE_BINDINGS, bindingOptions } from '../battery/bindings';

// The Stage 2 controls for one module. The schema decides the field type, the
// range and the options; this component only renders it and reports a change
// in display units. Modules with no separable settings render nothing, and the
// page prints their bind note instead.
export default function BatteryBindings({ moduleId, input, values, onChange }) {
  const fields = MODULE_BINDINGS[moduleId] ?? [];
  if (fields.length === 0) return null;

  return (
    <div className="battery-bindings">
      {fields.map((field) => {
        const id = `battery-binding-${moduleId}-${field.key}`;
        const value = values[field.key];
        const options = bindingOptions(field, input);
        if (field.kind === 'select' && value != null && value !== '' && !options.some((option) => option.value === String(value))) {
          options.push({ value: String(value), label: `${value} (not in the input)` });
        }

        return (
          <div key={field.key} className={`control${field.kind === 'boolean' ? ' battery-binding-check' : ''}`}>
            {field.kind === 'boolean' ? (
              <label htmlFor={id}>
                <input
                  id={id}
                  type="checkbox"
                  checked={Boolean(value)}
                  onChange={(event) => onChange(field.key, event.target.checked)}
                />
                {' '}
                {field.label}
              </label>
            ) : (
              <>
                <label htmlFor={id}>{field.label}</label>
                {field.kind === 'number' ? (
                  <NumInput
                    id={id}
                    value={Number.isFinite(Number(value)) ? Number(value) : null}
                    onChange={(next) => onChange(field.key, next)}
                    min={field.min}
                    max={field.max}
                    step={field.step}
                  />
                ) : options.length > 0 ? (
                  <select
                    id={id}
                    value={value == null ? '' : String(value)}
                    onChange={(event) => onChange(field.key, event.target.value)}
                  >
                    {options.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    id={id}
                    type="text"
                    value={value == null ? '' : String(value)}
                    onChange={(event) => onChange(field.key, event.target.value)}
                  />
                )}
              </>
            )}
            {field.note && (
              <p className="fine-print" style={{ margin: '0.25rem 0 0' }}>{field.note}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
