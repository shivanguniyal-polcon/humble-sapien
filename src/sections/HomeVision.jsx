// The frontispiece: the claim the rest of the page argues for, set beside the
// one list that makes it concrete. The catalogue below is the evidence; this
// section is the sentence it supports.
//
// The matrix is a specimen, not a language menu. The Eighth Schedule names 22
// languages; each is printed in its own script so the page begins with the
// Republic's own languages rather than with a claim about the site. Whether the
// law is actually readable in them is the question the timeline asks next.

import { TOOLS } from '../data/tools';

const EIGHTH_SCHEDULE = [
  { name: 'Assamese', endonym: 'অসমীয়া', code: 'as' },
  { name: 'Bengali', endonym: 'বাংলা', code: 'bn' },
  { name: 'Bodo', endonym: "बर'", code: 'brx' },
  { name: 'Dogri', endonym: 'डोगरी', code: 'doi' },
  { name: 'Gujarati', endonym: 'ગુજરાતી', code: 'gu' },
  { name: 'Hindi', endonym: 'हिन्दी', code: 'hi' },
  { name: 'Kannada', endonym: 'ಕನ್ನಡ', code: 'kn' },
  { name: 'Kashmiri', endonym: 'کٲشُر', code: 'ks' },
  { name: 'Konkani', endonym: 'कोंकणी', code: 'kok' },
  { name: 'Maithili', endonym: 'मैथिली', code: 'mai' },
  { name: 'Malayalam', endonym: 'മലയാളം', code: 'ml' },
  { name: 'Manipuri', endonym: 'ꯃꯤꯇꯩꯂꯣꯟ', code: 'mni' },
  { name: 'Marathi', endonym: 'मराठी', code: 'mr' },
  { name: 'Nepali', endonym: 'नेपाली', code: 'ne' },
  { name: 'Odia', endonym: 'ଓଡ଼ିଆ', code: 'or' },
  { name: 'Punjabi', endonym: 'ਪੰਜਾਬੀ', code: 'pa' },
  { name: 'Sanskrit', endonym: 'संस्कृतम्', code: 'sa' },
  { name: 'Santali', endonym: 'ᱥᱟᱱᱛᱟᱲᱤ', code: 'sat' },
  { name: 'Sindhi', endonym: 'سنڌي', code: 'sd' },
  { name: 'Tamil', endonym: 'தமிழ்', code: 'ta' },
  { name: 'Telugu', endonym: 'తెలుగు', code: 'te' },
  { name: 'Urdu', endonym: 'اردو', code: 'ur' },
];

// The heading is the anchor the frontispiece's second door points at. Move
// focus with the scroll so a keyboard reader lands where the page does.
function readCatalogue() {
  const title = document.getElementById('timeline-title');
  if (!title) return;
  // Focus first, with scrolling suppressed. The move is instant rather than
  // smooth: Chromium cancels a smooth scroll when its target takes focus, and
  // an instant move is the one that works for both pointer and keyboard.
  title.focus({ preventScroll: true });
  title.scrollIntoView({ behavior: 'auto', block: 'start' });
}

export default function HomeVision({ onNavigate }) {
  return (
    <section className="home-vision" aria-labelledby="vision-title">
      <div className="shell home-vision-inner">
        <div className="home-vision-copy">
          <p className="overline">The vision</p>
          <h1 id="vision-title" className="home-vision-title">
            THS is the fifth pillar of democracy.
          </h1>

          <p className="home-vision-lede">
            Not a fifth institution added to four. The legislature makes the
            law; the executive writes beneath it; the judiciary reads it; the
            press reports it. Each holds a piece of the record and speaks to
            the others. The public is spoken about.
          </p>
          <p className="home-vision-body">
            The fifth pillar is a new role, not another seat: the public holding
            the same record, with tools and receipts. That is the contribution
            THS is built to make &mdash; not another publisher with a search
            box, but a reader who can check the claim, count what was never
            counted, and answer with the state&rsquo;s own evidence.
          </p>

          <p className="home-vision-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => onNavigate?.('work')}
            >
              Explore the {TOOLS.length} instruments
            </button>
            <button type="button" className="linklike" onClick={readCatalogue}>
              Read the catalogue <span aria-hidden="true">&darr;</span>
            </button>
          </p>
        </div>

        <aside className="schedule-panel" aria-labelledby="schedule-title">
          <div className="schedule-head">
            <h2 id="schedule-title" className="schedule-title">
              The Eighth Schedule
            </h2>
            <span className="schedule-ordinal" aria-hidden="true">
              VIII
            </span>
          </div>

          <ul className="schedule-grid">
            {EIGHTH_SCHEDULE.map(({ name, endonym, code }) => (
              <li className="schedule-cell" key={code}>
                <span className="schedule-name" lang={code}>
                  {endonym}
                </span>
                <span className="schedule-meta">
                  {name}
                  <span className="schedule-code" aria-hidden="true">
                    {code}
                  </span>
                </span>
              </li>
            ))}
            <li className="schedule-cell schedule-mark" aria-hidden="true">
              <span className="schedule-mark-num">22</span>
              <span className="schedule-mark-word">languages</span>
            </li>
          </ul>

          <p className="schedule-note">
            The 22 languages the Constitution names, each set in its own script.
            A list, not a claim that the law is published in them.
          </p>
        </aside>
      </div>
    </section>
  );
}
