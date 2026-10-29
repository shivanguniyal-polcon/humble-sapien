// Canvas code cannot use var() directly. Read the current theme's tokens
// from computed style instead, cached per active theme.

let cache = { key: null, colors: null };

export const themeColors = () => {
  const key = document.documentElement.dataset.theme || 'root';
  if (cache.key === key) return cache.colors;
  const cs = getComputedStyle(document.documentElement);
  const read = (name) => cs.getPropertyValue(name).trim();
  cache = {
    key,
    colors: {
      accent: read('--color-accent-solid'),
      accentMid: read('--clay-400'),
      text: read('--color-text'),
    },
  };
  return cache.colors;
};

// Append an alpha to a computed CSS color. The tokens resolve to hex, but a
// future palette may hand back a functional color; support both, because a
// canvas fill that silently loses its alpha paints an opaque slab over the
// page (the arcade's ground did exactly that).
export const withAlpha = (color, a) => {
  const value = color.trim();
  const hex = value.replace('#', '');
  if (/^[0-9a-f]{6}$/i.test(hex)) {
    return `#${hex}${Math.round(a * 255).toString(16).padStart(2, '0')}`;
  }
  return value.includes('(')
    ? value.replace(/\(\s*([^()]*?)\s*\)\s*$/, `($1 / ${a})`)
    : value;
};
