import { useCountUp, useInView } from '../lib/useScrollStep';

// The flagship scrollytelling centrepiece: the policy sprawl.
// Every number is sourced (see sources at the bottom) and every step
// ends in a working THS tool, in the spirit of investigations that
// hand the reader something to use.

const Stat = ({ target, suffix, label, note, danger }) => {
  const [ref, value] = useCountUp(target);
  return (
    <div className={`sprawl-stat ${danger ? 'sprawl-danger' : ''}`} ref={ref}>
      <div className="sprawl-num data-num">
        {value.toLocaleString('en-IN')}
        {suffix}
      </div>
      <div className="sprawl-label">{label}</div>
      <div className="sprawl-note">{note}</div>
    </div>
  );
};

const Step = ({ children }) => {
  const [ref, inView] = useInView();
  return (
    <div ref={ref} className={`sprawl-step ${inView ? 'sprawl-step-in' : ''}`}>
      {children}
    </div>
  );
};

export default function SprawlStory({ onNavigate }) {
  return (
    <section className="sprawl">
      <div className="shell">
        <div className="section-head">
          <h1 className="sprawl-title">
            The rules exist. The reading does not.
          </h1>
          <p className="section-strap">
            India publishes more policy and more data than almost any democracy
            on earth. Very little of it is written for the people it describes.
            Here is the scale of the problem, in four numbers.
          </p>
        </div>

        <div className="sprawl-stats">
          <Stat
            target={890}
            label="Central Acts in force"
            note="A reported count from the Law Ministry, May 2025. Add state laws, rules and notifications and nobody has the full number. That is part of the problem."
          />
          <Stat
            target={314}
            label="Central schemes, one review cohort alone"
            note="54 centrally sponsored and 260 central sector schemes due for re-appraisal by March 2026 (PIB, May 2025)."
          />
          <Stat
            target={502000}
            suffix="+"
            label="Government data resources published"
            note="On the national open data platform alone, as of August 2024 (MoSPI). Published for everyone. Readable by almost no one."
            danger
          />
          <Stat
            target={83}
            label="Acts authenticated in regional languages"
            note="In 2023-24 (Legislative Department). The rules are in force in a language most people cannot read."
            danger
          />
        </div>

        <Step>
          <div className="sprawl-band">
            <h3>When the state cannot explain itself, people ask it to</h3>
            <p>
              In 2022-23 alone, citizens filed{' '}
              <strong className="data-num">16,38,784</strong> Right to
              Information requests with the central government, and{' '}
              <strong className="data-num">52,662</strong> were rejected. Each
              request is someone asking the government to explain what it
              already wrote down. It is the largest readability complaint in
              the world.
            </p>
          </div>
        </Step>

        <Step>
          <div className="sprawl-band">
            <h3>This is the gap THS exists to close</h3>
            <p>
              Not more data. Not another portal. Comprehension: evidence you
              can take apart, tools you can use, and language written for the
              people it describes. We build all three, and we publish our
              receipts.
            </p>
            <div className="btn-row">
              <button className="btn btn-primary" onClick={() => onNavigate('work')}>
                Open the policy simplifier
              </button>
              <button className="btn btn-secondary" onClick={() => onNavigate('data')}>
                Take apart a dataset
              </button>
            </div>
          </div>
        </Step>

        <p className="meta sprawl-sources">
          Sources: PIB (May 2025) on scheme re-appraisal; MoSPI presentation to
          the 28th COCSSO (Aug 2024) on open data resources; Legislative
          Department Annual Report 2023-24 on language authentication; Lok Sabha
          RTI statistics 2022-23. The Central Acts figure is a reported count
          and labelled as such. Numbers carry their dates because policies move.
        </p>
      </div>
    </section>
  );
}
