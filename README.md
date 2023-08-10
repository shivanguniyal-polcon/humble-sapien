# THS — The Humble Sapien

**Public interest technology for every policy.**

THS is a public interest technology initiative working toward registration as a not-for-profit civil society organisation, across the whole
policy surface — health, sanitation, governance, technology and beyond — the
way public-interest technology organisations work on tech policy: close to the
systems that shape people's lives, adversarial to weak evidence, useful to the
public.

Run by the learners of today, for the leaders of tomorrow.

## What's inside

- **Local solutions** — a knowledge base of grassroots fixes documented like
  evidence: what it is, where it lives, how it works, what backs the claim.
- **Policy simplifier** — a client-side pipeline that rewrites statutory
  phrasing into plain language, flags long sentences and extracts obligations
  (who must do what).
- **Touchpoint maps** — major schemes (PM-JAY, Swachh Bharat) broken into the
  citizen's journey, with what to measure at each touchpoint and the evidence.
- **THS Data Commons** — a playground, not a catalogue: chart series, pair
  datasets, run correlation and OLS fits yourself. Open tiers are free
  forever; the Commons Plus tier is the mission-locked revenue engine that
  funds the rest.
- **Field notes** — the thinking behind the venture.

## Development

```bash
npm install
npm run dev      # local dev server
npm run build    # production build to dist/
npm run preview  # preview the production build
node scripts/check-contrast.mjs   # measure WCAG contrast of the token pairs
```

Everything runs in the browser; no analysis sends data anywhere.

## Design

The interface follows the craft rules in
[jakubkrehel/skills](https://github.com/jakubkrehel/skills): a serif/sans type
pairing on a semantic scale, color ramps where every step has a role, exact
motion values (press 0.96 / 150ms, `cubic-bezier(0.2, 0, 0, 1)`), motion gated
behind `prefers-reduced-motion`, tabular numerals on data, and contrast
measured rather than estimated (`scripts/check-contrast.mjs`).
