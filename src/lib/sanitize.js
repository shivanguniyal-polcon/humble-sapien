// An allowlist HTML sanitizer for the one place untrusted text becomes markup.
//
// The battery renderers build HTML by string concatenation and inject it with
// `dangerouslySetInnerHTML`. Several of them interpolate user-supplied labels
// without escaping, so a project file with a label like
// `<img src=x onerror=alert(1)>` runs script in whoever opens the report.
// Chasing every interpolation is how the next one gets missed; the guarantee
// belongs at the sink.
//
// Two rules, and they are the whole design:
//
//   tags      only the vocabulary the renderers actually emit survives
//   attrs     only class/colspan/rowspan, plus href on links with a safe
//             scheme. Every event handler, style and script URL is dropped.
//
// Text is passed through untouched on purpose. The well-behaved renderers
// already escape their text, so re-escaping here would print `&amp;` as
// `&amp;amp;`. Filtering tags and attributes is what stops execution; it does
// not depend on the text being escaped.

const ALLOWED_TAGS = new Set([
  'a', 'b', 'br', 'code', 'div', 'em', 'h3', 'h4', 'h5', 'i', 'li', 'ol',
  'p', 'pre', 'small', 'span', 'strong', 'table', 'tbody', 'td', 'th',
  'thead', 'tr', 'u', 'ul',
]);

// Attributes that carry no behaviour. `href` is handled separately because it
// can carry a `javascript:` URL. `scope` is on the list because `<th scope>`
// is how a screen reader knows which header a cell belongs to — dropping it
// would make the report tables inaccessible.
const SAFE_ATTRS = new Set(['class', 'colspan', 'rowspan', 'scope']);

const SAFE_SCHEMES = /^(https?:|mailto:|#|\/)/i;

const attrString = (attrs) => {
  const out = [];
  for (const { name, value } of attrs) {
    const key = name.toLowerCase();
    if (key.startsWith('on')) continue; // onclick, onerror, onmouseover, …
    if (key === 'style') continue;
    if (key === 'href') {
      // A `javascript:` or `data:` URL is the same problem as an event
      // handler: it runs code when the link is followed.
      if (!SAFE_SCHEMES.test(value.trim())) continue;
      out.push(`href="${value.replace(/"/g, '&quot;')}"`);
      continue;
    }
    if (!SAFE_ATTRS.has(key)) continue;
    out.push(`${key}="${value.replace(/"/g, '&quot;')}"`);
  }
  return out.length ? ` ${out.join(' ')}` : '';
};

// Pull the attribute pairs out of a raw tag body like `a href="x" class='y'`.
const parseAttrs = (body) => {
  const attrs = [];
  const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*(?:=\s*("([^"]*)"|'([^']*)'|[^\s"'>]+))?/g;
  let m;
  while ((m = re.exec(body)) !== null) {
    const raw = m[3] ?? m[4] ?? (m[2] ? m[2].replace(/^["']|["']$/g, '') : '');
    attrs.push({ name: m[1], value: raw });
  }
  return attrs;
};

// Sanitise a fragment of HTML. Unknown tags are dropped; unknown attributes
// are dropped; text survives as written.
export const sanitizeHtml = (html) => {
  const source = String(html == null ? '' : html);
  let out = '';
  let i = 0;

  while (i < source.length) {
    const lt = source.indexOf('<', i);
    if (lt === -1) {
      out += source.slice(i);
      break;
    }
    out += source.slice(i, lt);

    const gt = source.indexOf('>', lt);
    if (gt === -1) {
      // An unterminated tag is markup we do not understand. Drop it rather
      // than let it run on as text.
      break;
    }

    const raw = source.slice(lt + 1, gt);
    const closing = raw.startsWith('/');
    const selfClosing = raw.endsWith('/');
    const body = closing ? raw.slice(1) : raw;
    const name = (body.trim().split(/[\s/]/)[0] || '').toLowerCase();

    if (!ALLOWED_TAGS.has(name)) {
      // Not a tag we know: drop the markup. If it was a script or style
      // element its content is dropped too, because we skip to its close tag.
      if (!closing && (name === 'script' || name === 'style')) {
        const close = source.toLowerCase().indexOf(`</${name}`, gt);
        if (close === -1) break;
        const closeGt = source.indexOf('>', close);
        i = closeGt === -1 ? source.length : closeGt + 1;
        continue;
      }
      i = gt + 1;
      continue;
    }

    if (closing) {
      out += `</${name}>`;
    } else {
      const attrBody = raw.slice(raw.indexOf(name) + name.length).replace(/\/$/, '');
      out += `<${name}${attrString(parseAttrs(attrBody))}${selfClosing ? ' /' : ''}>`;
    }
    i = gt + 1;
  }

  return out;
};
