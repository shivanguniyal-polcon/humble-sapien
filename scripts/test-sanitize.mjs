// Security check for the HTML sanitizer at the battery render sink.
//
//     node scripts/test-sanitize.mjs
//
// The renderers build HTML by concatenation and several interpolate
// user-supplied labels without escaping, so this test does two things: it
// feeds the real attacks through, and it proves the markup the renderers
// legitimately emit still comes out intact. A sanitizer that strips
// everything is safe and useless.

import { sanitizeHtml } from '../src/lib/sanitize.js';
import { escapeHtml } from '../src/battery/modules/decisionTree.js';

let failures = 0;
let checks = 0;

const ok = (name, cond, detail = '') => {
  checks += 1;
  if (cond) console.log(`  ok   ${name}`);
  else {
    failures += 1;
    console.error(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  }
};
const eq = (name, got, want) => ok(name, got === want, `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);

const ATTACKS = [
  ['script element', '<script>alert(1)</script>', ['<script', 'alert(1)']],
  ['image onerror', '<img src=x onerror=alert(1)>', ['<img', 'onerror']],
  ['event handler on an allowed tag', '<span onmouseover=alert(1)>x</span>', ['onmouseover']],
  ['uppercase event handler', '<span ONCLICK=alert(1)>x</span>', ['onclick', 'ONCLICK']],
  ['javascript: link', '<a href="javascript:alert(1)">x</a>', ['javascript:']],
  ['data: link', '<a href="data:text/html,<script>alert(1)</script>">x</a>', ['data:']],
  ['style attribute', '<span style="background:url(javascript:alert(1))">x</span>', ['style=']],
  ['iframe', '<iframe src="https://evil.test"></iframe>', ['<iframe']],
  ['svg onload', '<svg onload=alert(1)></svg>', ['<svg', 'onload']],
  ['body onload', '<body onload=alert(1)>', ['<body', 'onload']],
  ['form action', '<form action="javascript:alert(1)"><button>x</button></form>', ['<form', 'javascript:']],
  ['nested markup in a comment', '<!--<script>alert(1)</script>-->', ['<script']],
];

console.log('attacks are neutralised');
for (const [name, payload, mustNotContain] of ATTACKS) {
  const out = sanitizeHtml(`<p>${payload}</p>`);
  for (const bad of mustNotContain) {
    ok(`${name}: output carries no ${bad}`, !out.toLowerCase().includes(bad.toLowerCase()), out);
  }
}

console.log('\nthe renderers’ own markup survives');
{
  const table =
    '<table class="data-table"><thead><tr><th>Line</th></tr></thead>' +
    '<tbody><tr><th scope="row">Capex</th><td class="data-num">1,20,000</td></tr></tbody></table>';
  eq('a table comes through whole', sanitizeHtml(table), table);

  const list = '<ul><li><strong>Cost</strong> — <em>first year</em></li></ul>';
  eq('nested formatting comes through', sanitizeHtml(list), list);

  const link = '<a href="https://example.test/x" class="linklike">read</a>';
  eq('a safe link keeps its href', sanitizeHtml(link), link);

  const merged = '<td colspan="2" rowspan="3" class="x">y</td>';
  eq('table layout attributes survive', sanitizeHtml(merged), merged);
}

console.log('\ntext and entities are not re-escaped');
{
  eq('already-escaped text is untouched', sanitizeHtml('&amp; &lt; &gt;'), '&amp; &lt; &gt;');
  eq('a bare ampersand is untouched', sanitizeHtml('a & b'), 'a & b');
  eq('empty input is safe', sanitizeHtml(''), '');
  eq('null input is safe', sanitizeHtml(null), '');
  eq('an unterminated tag is dropped', sanitizeHtml('<script'), '');
}

console.log('\nthe escapeHtml helper still does its job');
{
  eq('escapeHtml neutralises a tag', escapeHtml('<b>'), '&lt;b&gt;');
  ok('escapeHtml leaves the sanitizer idempotent', sanitizeHtml(escapeHtml('<b>x</b>')) === '&lt;b&gt;x&lt;/b&gt;');
}

console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures) process.exit(1);
