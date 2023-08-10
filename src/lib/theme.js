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

// Append an alpha to a computed CSS color: 'oklch(L C H)' -> 'oklch(L C H / a)'.
export const withAlpha = (color, a) =>
  color.includes('(')
    ? color.replace(/\(\s*([^()]*?)\s*\)\s*$/, `($1 / ${a})`)
    : color;
