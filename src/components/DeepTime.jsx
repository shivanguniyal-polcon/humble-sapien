import { useRef, useState } from 'react';

// Deep time: how humans consumed policy, era by era. The rail is a proper
// tablist (arrow keys, roving focus), and every era ends in a working link:
// the THS tool that addresses what that era broke.

const ERAS = [
  {
    id: 'oral',
    era: 'Oral',
    glyph: '◉',
    years: 'before writing',
    changed: 'Rules lived in memory and the courtier’s ear. Decisions were announced, and the announcement was the law.',
    flaw: 'Access depended on who you knew.',
    gate: 'The elder, the courtier, the priest',
    reach: 'One settlement',
    feedback: 'Instant, but only for the powerful',
  },
  {
    id: 'script',
    era: 'Script',
    glyph: '✎',
    years: '3000 BCE onward',
    changed: 'Rules became manuscript: durable, portable, and written in the language of whoever held the scribes.',
    flaw: 'Literacy was the gate.',
    gate: 'The scribe and the literate few',
    reach: 'One court or kingdom',
    feedback: 'A petition, if you could write one',
  },
  {
    id: 'print',
    era: 'Print',
    glyph: '⎙',
    years: '1450 onward',
    changed: 'Gazettes and statutes. Policy became public in theory: the text existed for anyone who could read it.',
    flaw: 'Volume replaced listening.',
    gate: 'The printer and the reading public',
    reach: 'A nation, slowly',
    feedback: 'Letters to the editor, eventually',
  },
  {
    id: 'broadcast',
    era: 'Broadcast',
    glyph: '☏',
    years: '1920 onward',
    changed: 'One-way campaigns at national scale. Millions heard the same message on the same day.',
    flaw: 'The feedback loop broke.',
    gate: 'The broadcaster and the headline',
    reach: 'A country in a day',
    feedback: 'Almost none. Listen only.',
  },
  {
    id: 'internet',
    era: 'Internet',
    glyph: '⌗',
    years: '1995 onward',
    changed: 'Dashboards everywhere. Every department published data portals, and the PDF simply moved online.',
    flaw: 'The jargon moved online with it.',
    gate: 'The jargon and the interface',
    reach: 'The planet',
    feedback: 'Abundant noise, scarce reply',
    fix: {
      label: 'The policy simplifier cuts through the jargon',
      tab: 'work',
    },
  },
  {
    id: 'commons',
    era: 'Commons',
    glyph: '✺',
    years: 'now',
    changed: 'Evidence anyone can take apart, tools anyone can use, and language written for the people it describes.',
    flaw: 'This is where THS stands.',
    gate: 'No gate, if we build it right',
    reach: 'Everyone, in theory',
    feedback: 'Two-way by design',
    now: true,
    fix: {
      label: 'Enter the Data Commons and check our work',
      tab: 'data',
    },
  },
];

export default function DeepTime({ onNavigate }) {
  const [active, setActive] = useState('commons');
  const listRef = useRef(null);
  const era = ERAS.find((e) => e.id === active);
  const index = ERAS.findIndex((e) => e.id === active);

  const onKeyDown = (e) => {
    let next = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (index + 1) % ERAS.length;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (index - 1 + ERAS.length) % ERAS.length;
    if (e.key === 'Home') next = 0;
    if (e.key === 'End') next = ERAS.length - 1;
    if (next === null) return;
    e.preventDefault();
    setActive(ERAS[next].id);
    const buttons = listRef.current?.querySelectorAll('button');
    buttons?.[next]?.focus();
  };

  return (
    <div className="deeptime">
      <div
        className="dt-rail"
        role="tablist"
        aria-label="Eras of policy consumption"
        ref={listRef}
        onKeyDown={onKeyDown}
      >
        {ERAS.map((e, i) => (
          <button
            key={e.id}
            role="tab"
            id={`dt-tab-${e.id}`}
            aria-selected={active === e.id}
            aria-controls="dt-panel"
            tabIndex={active === e.id ? 0 : -1}
            className={`dt-node ${active === e.id ? 'dt-node-active' : ''} ${e.now ? 'dt-node-now' : ''}`}
            onClick={() => setActive(e.id)}
          >
            <span className="dt-glyph" aria-hidden="true">{e.glyph}</span>
            <span className="dt-era">{e.era}</span>
            <span className="dt-years data-num">{e.years}</span>
            <span className="dt-line" aria-hidden="true">
              <span className={`dt-fill ${active === e.id ? 'dt-fill-on' : ''}`} />
            </span>
          </button>
        ))}
      </div>

      <div
        className="dt-panel"
        id="dt-panel"
        role="tabpanel"
        aria-labelledby={`dt-tab-${era.id}`}
      >
        <div className="dt-panel-head">
          <h3 className="dt-title">
            {era.era} <span className="dt-title-years data-num">{era.years}</span>
          </h3>
          <p className="dt-changed">{era.changed}</p>
          <p className={`dt-flaw ${era.now ? 'dt-flaw-now' : ''}`}>{era.flaw}</p>
        </div>

        <dl className="dt-facts">
          <div className="dt-fact">
            <dt>Who held the gate</dt>
            <dd>{era.gate}</dd>
          </div>
          <div className="dt-fact">
            <dt>Reach of the rules</dt>
            <dd>{era.reach}</dd>
          </div>
          <div className="dt-fact">
            <dt>Feedback from the public</dt>
            <dd>{era.feedback}</dd>
          </div>
        </dl>

        {era.fix && (
          <button className="btn btn-primary dt-cta" onClick={() => onNavigate(era.fix.tab)}>
            {era.fix.label}
          </button>
        )}
      </div>

      <p className="meta dt-note">
        The eras are a way of thinking, not a dataset: the labels describe who
        could reach the rules and answer back. Arrow keys move along the rail.
      </p>
    </div>
  );
}
