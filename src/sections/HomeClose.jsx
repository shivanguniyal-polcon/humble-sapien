// The page ends on one ask. The problem and the mission stand in the
// timeline's own coda, where the reader meets them while the chart is still in
// view; the answer used to repeat that argument in a fourth movement, so it is
// gone. What remains is the one thing left to ask, in the dark, at the foot.

export default function HomeClose({ onNavigate }) {
  return (
    <section className="close-ask" aria-labelledby="ask-title">
      <div className="shell">
        <h2 id="ask-title" className="close-ask-title">
          Who gets to read the rules?
        </h2>
        <p className="close-ask-lede">
          The tools are free for citizens and civil society. This is how the
          work gets paid for.
        </p>
        <button
          type="button"
          className="btn close-ask-btn"
          onClick={() => onNavigate('support')}
        >
          Back the mission
        </button>
      </div>
    </section>
  );
}
