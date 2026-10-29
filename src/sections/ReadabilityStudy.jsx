import { citeLine, pubPermalink } from '../lib/cite';
import results from '../../articles/datapoint-ai-policy-readability/data/results.json';
import manifest from '../../articles/datapoint-ai-policy-readability/data/manifest.json';
import corpusHref from '../../articles/datapoint-ai-policy-readability/data/corpus.json?url';
import resultsHref from '../../articles/datapoint-ai-policy-readability/data/results.json?url';
import receiptsHref from '../../articles/datapoint-ai-policy-readability/data/receipts.md?url';
import manifestHref from '../../articles/datapoint-ai-policy-readability/data/manifest.json?url&no-inline';
import fig1 from '../../articles/datapoint-ai-policy-readability/figures/fig1-readability.svg?url';
import fig2 from '../../articles/datapoint-ai-policy-readability/figures/fig2-quadrant.svg?url';
import fig3 from '../../articles/datapoint-ai-policy-readability/figures/fig3-dumbbell.svg?url';
import fig4 from '../../articles/datapoint-ai-policy-readability/figures/fig4-permutation.svg?url';
import fig5 from '../../articles/datapoint-ai-policy-readability/figures/fig5-vocabulary.svg?url';

const FILES = {
  'data/corpus.json': corpusHref,
  'data/results.json': resultsHref,
  'data/receipts.md': receiptsHref,
  'figures/fig1-readability.svg': fig1,
  'figures/fig2-quadrant.svg': fig2,
  'figures/fig3-dumbbell.svg': fig3,
  'figures/fig4-permutation.svg': fig4,
  'figures/fig5-vocabulary.svg': fig5,
};

const FIGURES = [
  {
    src: fig1,
    href: 'figures/fig1-readability.svg',
    w: 1180,
    h: 780,
    title: 'Readability by instrument',
    caption:
      'All 18 instruments by Flesch Reading Ease. India averages 13.2, the Global North 13.0 and the Global South 10.4; all three corpora sit at graduate reading level.',
    alt:
      'Bar chart of Flesch Reading Ease for 18 AI instruments, grouped by India, the Global North and the Global South. India averages 13.2, the North 13.0 and the South 10.4.',
  },
  {
    src: fig2,
    href: 'figures/fig2-quadrant.svg',
    w: 1180,
    h: 800,
    title: 'Readability against vocabulary',
    caption:
      'Flesch score against the North-minus-South vocabulary gap. A point above the dashed line is closer to the Northern corpus; India’s six points fall on both sides.',
    alt:
      'Scatter plot of readability against the North-minus-South vocabulary gap. The Indian instruments fall on both sides of the zero line, with no clean regional cluster.',
  },
  {
    src: fig3,
    href: 'figures/fig3-dumbbell.svg',
    w: 1180,
    h: 720,
    title: 'Each Indian instrument against both centroids',
    caption:
      'Cosine similarity to the Northern and Southern centroids, with 95% bootstrap intervals. Four of the six Indian instruments sit closer to the South; the mean gap is -0.017 and its interval crosses zero.',
    alt:
      'Dumbbell chart of six Indian AI instruments, each with a Northern and Southern similarity score and bootstrap intervals. Four are closer to the South and two to the North.',
  },
  {
    src: fig4,
    href: 'figures/fig4-permutation.svg',
    w: 1180,
    h: 700,
    title: 'The permutation null',
    caption:
      'The observed mean gap against 2,000 shuffled labelings. The observed -0.017 sits inside the null distribution, so the regional labels do not carry the signal (p = 0.72).',
    alt:
      'Histogram of 2,000 shuffled region-label gaps. The observed gap of minus 0.017 sits inside the distribution, showing the regional grouping is not statistically distinguishable from chance.',
  },
  {
    src: fig5,
    href: 'figures/fig5-vocabulary.svg',
    w: 1180,
    h: 800,
    title: 'Which vocabulary travelled',
    caption:
      'Share of provisions using each term or phrase across the three corpora. The vocabulary is mixed; no single regional register owns India’s AI rules.',
    alt:
      'Heatmap of term and phrase usage across India, the Global North and the Global South. Usage is mixed, with no single regional vocabulary dominating the Indian corpus.',
  },
];

const compact = (value, digits = 0) =>
  Number(value).toLocaleString('en-IN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

const signed = (value) =>
  `${value >= 0 ? '+' : '−'}${Math.abs(value).toFixed(3)}`;

const PIT_ROWS = [
  ['benefits', 'Who benefits?'],
  ['pays', 'Who pays?'],
  ['missing', 'Who is missing?'],
];

export default function ReadabilityStudy({ pub, onBack }) {
  const indiaRows = results.instruments.filter((row) => row.region === 'india');
  const downloads = manifest.files.map((file) => ({
    ...file,
    href: FILES[file.path],
    name: file.path.split('/').pop(),
  }));

  return (
    <article className="pub-page study-page">
      <button className="linklike" onClick={onBack}>
        Back to the library
      </button>
      <p className="pub-kicker">
        {pub.type} · {pub.domain} · {pub.date}
      </p>
      <h2 className="pub-title">{pub.title}</h2>
      <p className="pub-byline">{pub.author}</p>
      <p className="pub-abstract">{pub.abstract}</p>

      <section className="pub-section">
        <h3>Key findings</h3>
        <ol className="pub-findings">
          {pub.findings.map((finding) => (
            <li key={finding}>{finding}</li>
          ))}
        </ol>
      </section>

      <section className="pub-section">
        <h3>The five figures</h3>
        <p className="fine-print">
          The complete figure set below is generated from the same results file
          offered for download. Each figure has a text description, and the six
          Indian instruments are also printed as a table underneath.
        </p>
        <div className="study-figures">
          {FIGURES.map((figure) => (
            <figure className="study-figure" key={figure.href}>
              <img
                src={figure.src}
                width={figure.w}
                height={figure.h}
                loading="lazy"
                decoding="async"
                alt={figure.alt}
              />
              <figcaption>
                <strong>{figure.title}.</strong> {figure.caption}{' '}
                <a href={figure.src} download={figure.href.split('/').pop()}>
                  Download the SVG
                </a>
                .
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="pub-section">
        <h3>The Indian instruments, in numbers</h3>
        <p className="fine-print">
          A positive gap means the instrument is closer to the Northern
          centroid; a negative gap means closer to the Southern one. Binding
          words are deontic terms per 1,000 words.
        </p>
        <div className="study-table-wrap">
          <table className="data-table study-table">
            <thead>
              <tr>
                <th scope="col">Instrument</th>
                <th scope="col" className="data-num">Flesch</th>
                <th scope="col" className="data-num">Grade</th>
                <th scope="col" className="data-num">Binding / 1,000</th>
                <th scope="col" className="data-num">Gap</th>
                <th scope="col">Closer to</th>
              </tr>
            </thead>
            <tbody>
              {indiaRows.map((row) => (
                <tr key={row.id}>
                  <th scope="row">{row.short}</th>
                  <td className="data-num">{row.flesch.toFixed(1)}</td>
                  <td className="data-num">{row.grade.toFixed(1)}</td>
                  <td className="data-num">{row.deontic.toFixed(1)}</td>
                  <td className="data-num">{signed(row.gap)}</td>
                  <td>{row.gap >= 0 ? 'North' : 'South'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="fine-print">
          Mean gap for the six: {results.headline.meanGap.toFixed(3)} (95%
          bootstrap {results.headline.gapLow.toFixed(3)} to{' '}
          {results.headline.gapHigh.toFixed(3)}). Permutation p ={' '}
          {results.headline.permutationP}. Nearest-neighbour lineage:{' '}
          {results.lineage.test.nearestNorth} North,{' '}
          {results.lineage.test.nearestSouth} South (p ={' '}
          {results.lineage.test.p}).
        </p>
      </section>

      <section className="pub-section">
        <h3>Methods and scope</h3>
        <p>{pub.methods}</p>
        <div className="study-note">
          <p>
            <strong>What this run changes.</strong> The results here were
            regenerated from the full {results.provisions}-provision corpus (
            {compact(results.corpusWords)} words), not the earlier 645-provision
            extract. The regional vocabulary difference is small and the 95%
            interval crosses zero; the page reports that negative result rather
            than rounding it into a regional story.
          </p>
          <p style={{ marginBottom: 0 }}>
            Every figure and number above is reproduced from{' '}
            <a href={resultsHref} download="results.json">results.json</a>. The
            source text and retrieval dates are in{' '}
            <a href={receiptsHref} download="receipts.md">receipts.md</a>.
          </p>
        </div>
      </section>

      <section className="pub-section">
        <h3>Data and downloads</h3>
        <p className="fine-print">
          These are the files themselves, not pointer notes. The manifest below
          records a SHA-256 for each one.
        </p>
        <ul className="study-downloads">
          {downloads.map((file) => (
            <li key={file.path}>
              <a href={file.href} download={file.name}>
                {file.name}
              </a>
              <span className="study-download-meta">
                {compact(file.bytes)} bytes · {file.role}
              </span>
            </li>
          ))}
          <li>
            <a href={manifestHref} download="manifest.json">
              manifest.json
            </a>
            <span className="study-download-meta">
              {manifest.files.length} hashes · sha256
            </span>
          </li>
        </ul>
      </section>

      <section className="pub-section">
        <h3>Verify the files</h3>
        <p className="fine-print">
          Hash the downloaded bytes and compare with the manifest. On macOS or
          Linux: <code>shasum -a 256 corpus.json</code>.
        </p>
        <div className="study-table-wrap">
          <table className="data-table study-manifest">
            <thead>
              <tr>
                <th scope="col">File</th>
                <th scope="col" className="data-num">Bytes</th>
                <th scope="col">SHA-256</th>
              </tr>
            </thead>
            <tbody>
              {manifest.files.map((file) => (
                <tr key={file.path}>
                  <th scope="row">{file.path}</th>
                  <td className="data-num">{compact(file.bytes)}</td>
                  <td>
                    <code>{file.sha256}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="pub-section">
        <h3>Who benefits, who pays, who is missing</h3>
        <dl className="pub-pit">
          {PIT_ROWS.map(([key, label]) => (
            <div key={key} className="pub-pit-row">
              <dt>{label}</dt>
              <dd>{pub.pit?.[key] || <em>[not answered]</em>}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="pub-section">
        <h3>References</h3>
        <ol className="pub-citations">
          {pub.citations.map((citation) => (
            <li key={citation}>{citation}</li>
          ))}
        </ol>
      </section>

      <section className="pub-section">
        <h3>Cite this work</h3>
        <p className="fine-print">
          Stable link: <a href={pubPermalink(pub)}>{pubPermalink(pub)}</a>
        </p>
        <p style={{ marginBottom: 0 }}>{citeLine(pub)}</p>
      </section>
    </article>
  );
}
