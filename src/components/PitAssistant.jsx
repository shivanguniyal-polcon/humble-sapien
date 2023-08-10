import { useState } from 'react';

// The public interest check: a small standing companion in the corner of every
// page. Each context carries a question that nudges the user toward using the
// tool in the public interest. It asks, it does not preach: one question, one
// line on why it matters, and a way to move on.

const CHECKS = {
  home: [
    {
      q: 'Before you publish a number, ask: who cannot see themselves in it?',
      why: 'The site counts Central Acts because that count exists. It also says who is missing from the count. Carry both into whatever you build.',
    },
    {
      q: 'Who would use this page if it were in their language?',
      why: 'Public interest technology starts with the reader, not the dataset. Design for the person the policy describes.',
    },
    {
      q: 'A tool the public cannot audit is a tool the public must simply trust. What can a stranger check here today?',
      why: 'Every estimator is pinned to hand-computed test cases and every parameter is published. Trust that survives inspection is the only kind worth building.',
    },
    {
      q: 'If this page loaded in two seconds on a cheap phone, who would it reach that it does not reach today?',
      why: 'Public interest technology is also kilobytes, contrast and keyboard access. Reach is a design decision, not an accident.',
    },
    {
      q: 'Which number on this site would a district official recognise as their own reality?',
      why: 'Evidence earns its place when the people inside the system can point at it and say: yes, that is what I see.',
    },
  ],
  research: [
    {
      q: 'A citation is a public good. Is the permalink in the brief you are about to send?',
      why: 'The people affected by a finding should be able to open the work, check the methods and disagree with it.',
    },
    {
      q: 'What would falsify this finding, and did you look?',
      why: 'Receipts cut both ways. Publishing the check that failed is public interest; publishing only the ones that passed is marketing.',
    },
    {
      q: 'Who paid for the data collection, and did that shape what could be asked?',
      why: 'Funding conditions are part of the method. Publish them beside the finding and the reader can weigh both.',
    },
  ],
  battery: [
    {
      q: 'Who never appears in the rows you just ingested?',
      why: 'The validation report counts what is missing. The public interest check asks WHO is missing. Both belong in the report.',
    },
    {
      q: 'If this run is reproduced in five years, will the parameters still be defensible?',
      why: 'A provenance note is a promise to the future. Write it as if a district collector will read it aloud in a budget hearing.',
    },
    {
      q: 'The unpriced ledger is not a footnote. Have you listed what resists money?',
      why: 'Time, dignity, safety and clean air rarely survive a spreadsheet. Name them in their own units before the NPV speaks.',
    },
    {
      q: 'A scenario that saves money by not paying claims is cutting someone. Who?',
      why: 'The unpaid-claims column is the distributional fact of a scenario run. Name who is denied or delayed before the verdict travels.',
    },
    {
      q: 'Whose weights are in your ranking, and did the people they describe get to see them?',
      why: 'A multi-criteria score is a value judgement in arithmetic. Publish the weights beside the ranking, or it is an opinion with decimals.',
    },
    {
      q: 'The verdict box travels without its assumptions. Did you staple the parameters to it?',
      why: 'A conclusion that escapes its own audit manifest becomes a rumour with a logo. Keep them stapled.',
    },
    {
      q: 'Who would be embarrassed if this run were read aloud in the assembly?',
      why: 'A public interest run should make power uncomfortable, never the people the data describes.',
    },
  ],
  licensing: [
    {
      q: 'A free tier is a promise about power. Who keeps it honest?',
      why: 'Free access for citizens and civil society is the accountability mechanism of every tool here. Price it, and the people the policies describe stop being able to check the analysis.',
    },
    {
      q: 'If a licence fee bought a different answer, what would that make the analysis?',
      why: 'Every tier runs the identical engine and faces the same public interest gate. Money buys rights and support, never results.',
    },
    {
      q: 'Who cannot use a tool that only reads CSV and JSON?',
      why: 'Format requirements exclude people before they start. Say plainly what the input needs, and offer the route for the person who has only a photograph of a table.',
    },
    {
      q: 'Who audits the audit? What can the public verify without asking permission?',
      why: 'Reproducibility is public interest infrastructure. If verification needs a favour, it is not verification.',
    },
  ],
  lab: [
    {
      q: 'An estimate is a claim about people. Who is missing from this data?',
      why: 'Census 2011 counts every resident but is dated; NFHS covers households but not institutions. Name the blind spot beside the coefficient.',
    },
    {
      q: 'If this result is wrong, who pays for the error?',
      why: 'Errors in policy analysis land on the least powerful first. Report the interval, not just the point.',
    },
    {
      q: 'Will the people described by this data ever see it?',
      why: 'Export the table, translate the labels, and put the result where the affected community can reach it.',
    },
    {
      q: 'A significant coefficient is not a policy. Who is at the far end of it?',
      why: 'Estimates describe averages of people. Name the individual consequence before recommending the intervention.',
    },
    {
      q: 'The standard error is a promise about uncertainty. Did it travel with the headline?',
      why: 'A point estimate without an interval is a slogan. The interval is the honest part.',
    },
  ],
  stakeholders: [
    {
      q: 'Look at the bottom of the matrix before you write the verdict.',
      why: 'The parties with the least power usually carry the largest restrictions. That is the finding, not the footnote.',
    },
    {
      q: 'Whose voice is missing from this ledger entirely?',
      why: 'A map is only as public-interest as its absentees. Add the stakeholder who was not consulted.',
    },
    {
      q: 'Does any party here bear a cost without any say?',
      why: 'That combination is the standard test of a policy that needs redesign, not just explanation.',
    },
    {
      q: 'Who is powerful enough to not appear in the data at all?',
      why: 'Some parties shape policy precisely by staying off the record. Their absence is a finding about power.',
    },
  ],
  touchpoints: [
    {
      q: 'Every touchpoint is a person in a queue.',
      why: 'Point the escalation route at an office that actually answers, and write it the way a person would say it out loud.',
    },
    {
      q: 'What happens to the person who gives up at step three?',
      why: 'Design the map for the hardest journey through the scheme, not the average one.',
    },
    {
      q: 'Which step in this chain has no named human responsible for it?',
      why: 'Touchpoints without owners are where entitlements go to die. Name the office and the officer.',
    },
  ],
  simplifier: [
    {
      q: 'Simplify until the person described could recognise their own rights in it.',
      why: 'Plain language is a delivery mechanism. If the text still protects the office more than the citizen, it is not simple yet.',
    },
    {
      q: 'Did simplification change what the rule means?',
      why: 'Keep the original beside the rewrite. A nudge that hides the legal text is not in the public interest.',
    },
    {
      q: 'Can the person described act on this text today, or do they still need an intermediary?',
      why: 'Plain language without a next step is decoration. The simplification ends when the reader knows what to do.',
    },
  ],
  scorecards: [
    {
      q: 'A promise is owed to the public, not to the scorecard.',
      why: 'Cite the record the affected community can verify themselves, including the promises with no visible delivery.',
    },
    {
      q: 'Who decided what counts as delivered?',
      why: 'Publish the grading rule with the grade. Judgement without a stated rule is politics wearing a spreadsheet.',
    },
    {
      q: 'What would the government say in its defence here, and have you printed it?',
      why: 'A scorecard with no steelman is a verdict, not evidence. Give the counter its strongest form.',
    },
  ],
  solutions: [
    {
      q: 'A local solution works under local conditions.',
      why: 'Record the conditions with the solution, or replication fails on the people who can least afford the failure.',
    },
    {
      q: 'Whose knowledge is this?',
      why: 'Name the community that built it. Public interest includes credit, not just access.',
    },
    {
      q: 'What does this solution cost the people who maintain it?',
      why: 'Local innovation often runs on unpaid labour. Record the upkeep, not just the spark.',
    },
  ],
  notes: [
    {
      q: 'Corrections in public are part of the method.',
      why: 'Say what you got wrong and who it affected. That is how evidence earns the trust it asks for.',
    },
    {
      q: 'Is the correction as visible as the original claim?',
      why: 'Errata buried at the bottom serve the publisher. Corrections next to the claim serve the public.',
    },
  ],
  arcade: [
    {
      q: 'The rules in the game are somebody is housing, health or pension in real life.',
      why: 'Play is fine. Closing the loop back to the real scheme is the public interest part.',
    },
    {
      q: 'Who cannot play this game, and what does that say about the scheme it models?',
      why: 'Exclusion in the simulation mirrors exclusion in the service. Note both.',
    },
  ],
  data: [
    {
      q: 'Open data is not equal data. Who is not counted?',
      why: 'Ask before you draw a line through the points. The uncounted are usually the unempowered.',
    },
    {
      q: 'What could this dataset be used to do to people?',
      why: 'Every dataset has a hostile use. Naming it is the first duty of the person publishing it.',
    },
    {
      q: 'Is the machine-readable file the only version, or is there one a human can read?',
      why: 'CSV is for tools. A table a person can open in a browser is for the public.',
    },
  ],
  compare: [
    {
      q: 'Note who pays in each system before the comparison travels.',
      why: 'Policy imports fail when the financing and the excluded are left behind. Compare the costs as carefully as the coverage.',
    },
    {
      q: 'Whose success is this metric?',
      why: 'A system can look efficient while failing the people at its edges. Read the edge cases beside the averages.',
    },
    {
      q: 'What did each system refuse to cover, and who lived with that refusal?',
      why: 'Coverage comparisons that skip the exclusions describe marketing, not systems.',
    },
  ],
  writing: [
    {
      q: 'Words move budgets. Keep the receipts one sentence away from every claim.',
      why: 'Writing in the public interest means the reader can check you without a subscription or a degree.',
    },
    {
      q: 'Who is quoted without being asked?',
      why: 'Field notes carry power. Consent and attribution are part of the evidence chain.',
    },
  ],
  about: [
    {
      q: 'The work is public interest only if the public can use it.',
      why: 'Keep the tools free to use and the methods open to inspection. Access is the accountability mechanism.',
    },
    {
      q: 'What would make this organisation deserve the word humble?',
      why: 'Name the finding that would change this organisation, and publish the method that could produce it.',
    },
  ],
  support: [
    {
      q: 'Funding shapes questions before it shapes answers.',
      why: 'Keep the funding conditions as public as the findings. Independence that is invisible cannot be checked.',
    },
    {
      q: 'Would this page still say the same thing if the largest donor read it first?',
      why: 'Independence is tested at the uncomfortable finding, not the annual report.',
    },
  ],
};

const DEFAULT_CHECK = {
  q: 'Public interest test: who benefits, who pays, who is missing?',
  why: 'If the tool in front of you cannot answer all three, the analysis is not finished.',
};

export default function PitAssistant({ route }) {
  const [open, setOpen] = useState(true);
  const [idx, setIdx] = useState(0);

  const key = route && route.tab === 'work' && route.sub ? route.sub : (route ? route.tab : 'home');
  const checks = CHECKS[key] || [DEFAULT_CHECK];
  const check = checks[idx % checks.length];

  if (!open) {
    return (
      <button
        type="button"
        className="pit-fab pit-fab-collapsed"
        aria-label="Open the public interest check"
        onClick={() => {
          setOpen(true);
          setIdx(0);
        }}
      >
        PIT
      </button>
    );
  }

  return (
    <aside className="pit-card" role="complementary" aria-label="Public interest check">
      <div className="pit-head">
        <span className="pit-kicker">Public interest check</span>
        <button
          type="button"
          className="linklike pit-close"
          aria-label="Dismiss the public interest check"
          onClick={() => setOpen(false)}
        >
          Dismiss
        </button>
      </div>
      <div aria-live="polite">
        <p className="pit-question">{check.q}</p>
        <p className="pit-why">{check.why}</p>
      </div>
      <div className="pit-actions">
        <button type="button" className="btn btn-secondary" onClick={() => setIdx(idx + 1)}>
          Next check
        </button>
        <button
          type="button"
          className="btn btn-primary pit-fab-inline"
          aria-label="Collapse the public interest check"
          onClick={() => setOpen(false)}
        >
          PIT
        </button>
      </div>
    </aside>
  );
}
