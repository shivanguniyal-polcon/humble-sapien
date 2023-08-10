import datasets from '../data/datasets.json';

// Show your working: every model on this site, its data, its assumptions,
// its fit, and its failures. Downloads are generated in the browser.

const download = (name, text, type) => {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
};

const toCsv = (rows) => {
  const cols = Object.keys(rows[0]);
  const esc = (v) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n');
};

const seriesToRows = () => {
  const rows = [];
  for (const [key, pts] of Object.entries(datasets.pmjay_series)) {
    for (const p of pts) rows.push({ series: key, date: p.d, value: p.v });
  }
  return rows;
};

const DOWNLOADS = [
  {
    name: 'PM-JAY official series (cards, admissions, hospitals, value)',
    detail: '27 milestone points with dates. The full 28-row anchor file with per-row source URLs lives in the research corpus.',
    file: 'ths_pmjay_series.csv',
    rows: seriesToRows,
  },
  {
    name: 'PM-JAY state admissions by financial year',
    detail: '123 state-by-year rows from the PIB annexure (PRID 1813651).',
    file: 'ths_pmjay_states.csv',
    rows: () => datasets.pmjay_states,
  },
  {
    name: 'EC98 horserace regressions',
    detail: '47 coefficient rows with clustered standard errors, by section and gender group.',
    file: 'ths_ec98_horserace.csv',
    rows: () => datasets.ec98_horserace,
  },
  {
    name: 'Dosage-response design output',
    detail: '21 rows across designs and outcomes, with dose coefficients and randomisation-inference p-values.',
    file: 'ths_dosage_ddd.csv',
    rows: () => datasets.dosage_ddd,
  },
  {
    name: 'EVM gender-gap regressions',
    detail: '13 coefficient rows from the EVM turnout analysis.',
    file: 'ths_evm_gender_gap.csv',
    rows: () => datasets.evm_gender_gap,
  },
];

const METHOD_CARDS = [
  {
    title: 'PM-JAY programme model (system dynamics)',
    method:
      'A stock-and-flow model of enrolment, admissions and empanelled hospitals, calibrated in log space to official trajectories. Differential evolution finds the global fit, bounded least squares polishes it.',
    data: '28 anchor rows from PIB releases, Lok Sabha written replies and the NHA Annual Report 2024-25, each row carrying its URL. The live NHA dashboard is geo-blocked outside India, so published anchors are used instead.',
    fit: [
      ['Cards (cumulative)', '5 anchors', 'MAPE 4.5%'],
      ['Admissions (cumulative)', '9 anchors', 'MAPE 4.5%'],
      ['Hospitals (count)', '8 anchors', 'MAPE 2.8%'],
      ['Treatment value (₹ crore)', '3 anchors', 'MAPE 4.3%'],
    ],
    assumptions: [
      'Enrolment closes the gap on the roughly 50 crore eligible pool at 0.363 per year, with a short verification drive early and a campaign wave in 2023-25.',
      'Utilisation per cardholder is flat at 0.084 admissions per year. Admissions growth comes from enrolment, not from sicker members.',
      'Empanelment follows a logistic curve with a 45,000 hospital ceiling.',
      'Average claim size starts near ₹10,180 and grows about 7.9% per year, matching published milestones.',
    ],
    limits: [
      'A September 2019 hospital anchor repeats the launch figure in official materials. The fit passes through the other seven points within 2%.',
      'Card series mixes dashboard definitions (cards created, individuals provided). We anchor to published cumulative values and model churn separately.',
      'Money-side flows are structurally simple. The sustainability question lives in the projection window, not the fitted history.',
    ],
  },
  {
    title: 'Cross-dataset engine (this playground)',
    method:
      'Pearson correlation, ordinary least squares slope and R-squared, recomputed in your browser on every change. No data leaves the page.',
    data: 'Whatever two series you select. See the downloads below.',
    fit: [],
    assumptions: [
      'Two series are paired at the nearest milestone date within 220 days, one to one.',
      'Zero-value launch anchors are the definition of a start, not an observation. They are excluded from analysis and disclosed in the reading.',
      'Three or more paired positive points are needed before a fit line is drawn.',
    ],
    limits: [
      'Correlation between two rising programme series is not causation. The reading panel says so in plain words every time.',
    ],
  },
  {
    title: 'Regression outputs (EC98, dosage, EVM)',
    method:
      'Coefficient tables from the research corpus: OLS and difference-in-difference style designs with clustered standard errors, plus randomisation-inference p-values for the dosage design.',
    data: 'Derived from the raw diagnostic outputs in the THS research corpus (evm_diagnostic_outputs and related files).',
    fit: [],
    assumptions: [
      'Specifications follow the source files. What you see is what the design estimated, including N and interval width.',
    ],
    limits: [
      'A coefficient is a statement about a design and a sample, not a universal law. Read the N and the interval before the sign.',
    ],
  },
  {
    title: 'Policy simplifier (Flesch and Hindi layer)',
    method:
      'Flesch Reading Ease and Flesch-Kincaid grade from sentence length and a vowel-group syllable estimate. Rewrites run on whole-phrase replacements and clause splitting, then both texts are scored.',
    data: 'Your input text. Nothing is uploaded.',
    fit: [],
    assumptions: [
      'Syllables are estimated by heuristic, so scores are accurate to a couple of points, not to a decimal.',
      'The Hindi layer is rule-based over statutory terms and clause templates. Connective prose may remain in English.',
    ],
    limits: [
      'Hindi output needs a translator review before formal use. The tool labels this at the panel.',
    ],
  },
];

export default function Methods() {
  return (
    <div>
      <div className="card">
        <h3>Methods and downloads</h3>
        <p style={{ marginBottom: 0 }}>
          The reproducibility layer. Every number on this site comes from a
          model or a measurement, and every model has assumptions. Here they
          all are, including where we know the answer is fragile. Take the raw
          data and check our work.
        </p>
      </div>

      {METHOD_CARDS.map((m) => (
        <div key={m.title} className="card method-card">
          <h3>{m.title}</h3>
          <div className="approach-grid">
            <div className="approach-row">
              <span className="approach-key">Method</span>
              <p className="approach-val">{m.method}</p>
            </div>
            <div className="approach-row">
              <span className="approach-key">Data</span>
              <p className="approach-val">{m.data}</p>
            </div>
            {m.assumptions.length > 0 && (
              <div className="approach-row">
                <span className="approach-key">Assumptions</span>
                <ul className="approach-val method-list">
                  {m.assumptions.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              </div>
            )}
            {m.limits.length > 0 && (
              <div className="approach-row">
                <span className="approach-key">Where it breaks</span>
                <ul className="approach-val method-list">
                  {m.limits.map((l) => (
                    <li key={l}>{l}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          {m.fit.length > 0 && (
            <table className="data-table method-fit">
              <thead>
                <tr>
                  <th scope="col">Indicator</th>
                  <th scope="col">Anchors</th>
                  <th scope="col">Fit</th>
                </tr>
              </thead>
              <tbody>
                {m.fit.map(([a, b, c]) => (
                  <tr key={a}>
                    <td>{a}</td>
                    <td className="data-num">{b}</td>
                    <td className="data-num">{c}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ))}

      <div className="card">
        <h3>Raw data downloads</h3>
        <p className="meta">
          Generated in your browser from the same JSON the charts read. CSV
          opens in any spreadsheet.
        </p>
        <div className="btn-row">
          {DOWNLOADS.map((d) => (
            <button
              key={d.file}
              className="btn btn-secondary"
              onClick={() => download(d.file, toCsv(d.rows()), 'text/csv')}
            >
              Download {d.file.replace('ths_', '').replace('.csv', '')}
            </button>
          ))}
          <button
            className="btn btn-secondary"
            onClick={() =>
              download('ths_data_commons.json', JSON.stringify(datasets, null, 2), 'application/json')
            }
          >
            Download everything (JSON)
          </button>
        </div>
        <p className="meta" style={{ marginBottom: 0 }}>
          Downloads cover the open and demo-unlocked data shown on this site.
          The source corpus (anchor CSVs with URLs, model code, calibration
          harness) lives in the THS research files and is available to Commons
          Plus supporters on request.
        </p>
      </div>
    </div>
  );
}
