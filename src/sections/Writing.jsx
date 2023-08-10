import { useState } from 'react';

const ESSAYS = [
  {
    id: 'evolve',
    title: 'Policy must evolve, and so must the way we read it',
    date: 'October 2026',
    minutes: 4,
    standfirst:
      'Humans evolved. The way we consume policy did not. That gap is why this organisation exists.',
    body: [
      'Here is a small strange fact. For most of human history, information moved at the speed of a walking horse. Then it moved at the speed of a printing press, then a radio wave, then light in a glass cable. Every time the speed changed, society changed with it. The Reformation needed the printing press. Democracy needed newspapers.',
      'Policy never got that upgrade. A budget document today looks a lot like a budget document from 1952: dense, formal, written to be filed rather than read. The people it describes are stuck on the wrong side of the glass.',
      'I started The Humble Sapien because I think this is fixable, and because I think fixing it is not a design problem alone. It is a dignity problem. When a scheme is written in language only an officer can parse, the citizen is not a citizen. She is a supplicant.',
      'So we treat policy like something alive. It has a genome you can sequence with data, a body you can touch through tools, and a voice you can actually understand. The name is a joke with a straight face: we are humble, we are sapiens, and we are still evolving. The work is to make sure the way we govern evolves too.',
    ],
  },
  {
    id: 'questions',
    title: 'What 214 parliamentary questions taught me about asking',
    date: 'September 2026',
    minutes: 5,
    standfirst:
      'A question in Parliament is a small machine for turning private worry into public record. I have built these machines and audited them.',
    body: [
      'As a LAMP Fellow I drafted 60 parliamentary questions for a Member of the 17th Lok Sabha. Sixty is about one in five of what a Member asks in a full term. The work taught me the grammar of accountability: a well worded question forces an answer that enters the record, and the record can then be checked.',
      'Later I went back and read the questions themselves as data. 214 questions across 24 files. Watch what gets asked and a map of the country appears: out of pocket health spending, drug prices, migrant labour databases, blockchain, gender gaps, snatched chains in local markets. The small questions are not small. They are the state being told, politely, to show its work.',
      'Two lessons stayed with me. First, the starred question that gets oral time is politics; the unstarred question that gets a written answer is infrastructure. Both matter, and they are not the same tool. Second, a question is only as good as the follow up. An answer on paper with nobody reading it is a tree falling in an empty forest.',
      'That is why this site keeps receipts. Every claim we make points at a file, a source, a date. Asking is easy. Asking so that the answer can be checked later, that is the craft.',
    ],
  },
  {
    id: 'promise',
    title: 'A promise is not a record',
    date: 'October 2026',
    minutes: 4,
    standfirst:
      'Manifestos are written in the future tense. We read them in the past tense, and the difference is where accountability lives.',
    body: [
      'Before an election, everything is possible: a health recruitment board, a health stack, a preventive healthcare fund, a genetics centre. These are real promises from a real manifesto in Gujarat, 2022. I know, because I helped analyse that manifesto in detail. Health and child development took 26 per cent of all commitments.',
      'So what happened after? We checked, promise by promise, against public evidence. One board was recommended by a reforms commission but is not verified as constituted. The digital health identity exists at enormous scale, but the specific one stop health stack is not verified. The fund and the centre: no public evidence found.',
      'Notice the language we use. No public evidence found is not the same as it did not happen. It means the promise was made in public and the receipt was not. That gap is the whole subject of accountability work. Governments should not be asked to whisper their achievements; they should be asked to leave paper.',
      'The tool on this site does exactly that, in the open. Take a promise. Take the record. Read them side by side. Then decide what to ask for next, in the form of a question somebody must answer.',
    ],
  },
];

export default function Writing({ onNavigate }) {
  const [open, setOpen] = useState('evolve');
  const essay = ESSAYS.find((e) => e.id === open);

  return (
    <section>
      <div className="section-head">
        <span className="overline">Writing</span>
        <h2>Notes from the workshop</h2>
        <p className="section-strap">
          Short essays by Shivang Uniyal, founder of THS, on why policy
          consumption must evolve, what the record actually says, and how the
          work is done. Plain words, no jargon, no fine print.
        </p>
      </div>

      <div className="filter-row" role="group" aria-label="Choose an essay">
        {ESSAYS.map((e) => (
          <button
            key={e.id}
            className={`chip ${open === e.id ? 'chip-active' : ''}`}
            aria-pressed={open === e.id}
            onClick={() => setOpen(e.id)}
          >
            {e.title.split(',')[0].split(':')[0]}
          </button>
        ))}
      </div>

      <article className="card essay">
        <p className="meta">
          Shivang Uniyal · {essay.date} · about {essay.minutes} minutes
        </p>
        <h3 className="essay-title">{essay.title}</h3>
        <p className="essay-standfirst">{essay.standfirst}</p>
        {essay.body.map((para, i) => (
          <p key={i} className="essay-body">
            {para}
          </p>
        ))}
        <p className="meta" style={{ marginBottom: 0 }}>
          Part of the THS voice: one person writing in the open, and the whole
          organisation standing behind the facts.
        </p>
      </article>

      <div className="card tool-ending">
        <h3>Now use it</h3>
        <p>
          Every essay here has a tool behind it. If this one made you want to
          check a promise, read a law or break open a dataset, the instruments
          are free and waiting.
        </p>
        <div className="btn-row">
          <button className="btn btn-primary" onClick={() => onNavigate('work')}>
            Open the promise scorecards
          </button>
          <button className="btn btn-secondary" onClick={() => onNavigate('data')}>
            Take apart a dataset
          </button>
        </div>
      </div>
    </section>
  );
}
