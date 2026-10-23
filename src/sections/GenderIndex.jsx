import { useMemo, useState } from 'react';
import {
  GENDER_INDICATORS,
  DEFAULT_WEIGHTS,
  UNJOINED_UNITS,
  computeGenderIndex,
} from '../lib/genderIndex.js';

const WEIGHT_STEPS = [0, 0.5, 1, 1.5, 2, 3];

export default function GenderIndex() {
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS);

  const { ranked, unranked } = useMemo(
    () => computeGenderIndex(weights),
    [weights],
  );

  const weightSum = GENDER_INDICATORS.reduce(
    (sum, ind) => sum + (Number(weights[ind.key]) || 0),
    0,
  );
  const isDefault = GENDER_INDICATORS.every(
    (ind) => weights[ind.key] === DEFAULT_WEIGHTS[ind.key],
  );

  const setWeight = (key, value) =>
    setWeights({ ...weights, [key]: Number(value) });

  return (
    <div>
      <div className="card">
        <h3>Gender inclusion index</h3>
        <p>
          Five indicators, thirty-six states and union territories, two public
          sources. Women with ten or more years of schooling, institutional
          births and anaemia among women aged 15 to 49 from NFHS-5 (2019-21);
          sex ratio and female literacy from Census 2011.
        </p>
        <p style={{ marginBottom: 0 }}>
          Each indicator is scaled to a position in the distribution, then
          combined at the weights below. Change the weights and the ranking
          changes with them, because the weight you give anaemia or sex ratio
          is a judgement, not a fact. The method note at the bottom says what
          every step does.
        </p>
      </div>

      <div className="card">
        <h4>Weights</h4>
        <p className="meta">
          Zero removes an indicator entirely. The default is equal weights.
          {!isDefault && (
            <>
              {' '}
              <button
                type="button"
                className="linklike"
                onClick={() => setWeights(DEFAULT_WEIGHTS)}
              >
                Reset to equal weights
              </button>
            </>
          )}
        </p>
        {GENDER_INDICATORS.map((ind) => (
          <div className="control" key={ind.key}>
            <label htmlFor={`weight-${ind.key}`}>
              {ind.label}{' '}
              <span className="meta">
                ({ind.source}; {ind.higherIsBetter ? 'higher is better' : 'lower is better'})
              </span>
            </label>
            <select
              id={`weight-${ind.key}`}
              value={weights[ind.key]}
              onChange={(e) => setWeight(ind.key, e.target.value)}
            >
              {WEIGHT_STEPS.map((w) => (
                <option key={w} value={w}>
                  {w === 0 ? '0 — excluded' : w}
                </option>
              ))}
            </select>
          </div>
        ))}
        {weightSum === 0 && (
          <p className="notice notice-amber" role="status">
            Every weight is zero, so there is nothing to rank. Give at least
            one indicator a weight above zero.
          </p>
        )}
      </div>

      <div className="card">
        <h4>
          Ranking <span className="meta">({ranked.length} of {ranked.length + unranked.length} units scored)</span>
        </h4>
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">Rank</th>
              <th scope="col">State / UT</th>
              <th scope="col">Index</th>
              {GENDER_INDICATORS.map((ind) => (
                <th scope="col" key={ind.key}>
                  {ind.label}
                  <span className="meta table-sub">
                    {weights[ind.key] === 0 ? 'excluded' : `w ${weights[ind.key]}`}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ranked.map((row) => (
              <tr key={row.state}>
                <td className="data-num">{row.rank}</td>
                <td>
                  {row.state}
                  {row.missing.length > 0 && (
                    <span className="meta table-sub">
                      missing: {row.missing.join('; ')}
                    </span>
                  )}
                  {row.censusNote && (
                    <span className="meta table-sub">{row.censusNote}</span>
                  )}
                </td>
                <td className="data-num index-score">{row.score}</td>
                {GENDER_INDICATORS.map((ind) => (
                  <td className="data-num" key={ind.key}>
                    {row.parts[ind.key] ?? '—'}
                    <span className="meta table-sub">
                      {row.raw[ind.key] ?? 'no data'}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
            {unranked.map((row) => (
              <tr key={row.state} className="index-unranked">
                <td className="data-num">—</td>
                <td>{row.state}</td>
                <td className="data-num">not scored</td>
                {GENDER_INDICATORS.map((ind) => (
                  <td className="data-num" key={ind.key}>
                    {row.raw[ind.key] ?? '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h4>Method note</h4>
        <p>
          <strong>Scaling.</strong> Each indicator is min-max scaled across the
          units that have it, so a score is a position in the distribution from
          0 to 100, not a percentage of anything. Anaemia is inverted before
          scaling, so 100 is always better for women.
        </p>
        <p>
          <strong>Missing data.</strong> A unit missing one indicator is scored
          on the rest, with the weights renormalised over what it has, and the
          row names the gap. A unit missing every indicator gets no score and
          stays on the table. Nothing is interpolated.
        </p>
        <p>
          <strong>Two vintages.</strong> NFHS-5 is 2019-21. Census 2011 is
          2011, because the 2021 census was not held. The two are joined on
          state and not blended in time. Anaemia measurement changed between
          NFHS-4 and NFHS-5; this index uses NFHS-5 only, so the ranking is
          cross-sectional and makes no trend claim.
        </p>
        <p>
          <strong>What this is not.</strong> Not a measure of agency, safety,
          work or pay. Those are the ones that matter most and the ones these
          two surveys do not carry on their own. This is the best five-column
          read the public data supports, and it says so.
        </p>
        <p style={{ marginBottom: 0 }}>
          <strong>Sources.</strong> NFHS state factsheets via IIPS/DHS
          (nfhsiips.in, dhsprogram.com), extracted by
          pratapvardhan/NFHS-5 and HindustanTimesLabs/nfhs-data. Census 2011
          state totals. Both loaded in this browser; nothing leaves your
          machine.
        </p>
      </div>

      {UNJOINED_UNITS.length > 0 && (
        <div className="card">
          <h4>Units that do not join cleanly</h4>
          <ul className="evidence-list">
            {UNJOINED_UNITS.map((u) => (
              <li key={u.unit}>
                <strong>{u.unit}</strong> — {u.reason}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
