// The scheme ladder: for each major central scheme, the chain of offices a
// citizen walks up, from the village to the ministry.
//
// Every rung carries four things a directory usually leaves out:
//
//   where   the counter or the window to reach
//   what    that office decides, in the words the scheme's own rules use
//   status  how firm the claim is, and on what evidence
//   source  the page or section it was read from
//
// The status vocabulary is the point. A citizen who is sent to the wrong
// office loses a day, so the tool refuses to blur the difference between a
// post the law creates and a post a state happens to use:
//
//   statutory  the Act or the scheme guideline creates this office
//   official   the scheme owner publishes it on a page that was read
//   varies     the office exists, but its designation differs by state
//   portal     the step is the online window, not an office
//
// Everything marked "varies" is a prompt to look the local name up, not a
// claim about it. Nothing here asserts a post name that was not read from an
// official source.
//
// A situation may also carry a clock: the deadlines the law sets. Each one
// counts from a date the citizen gives, and each says what to do once it has
// passed. Where no document sets a period, the situation carries a clockGap
// instead: the document that was read, and what it does not fix. A blank
// clock is then a finding, not a gap in the build.

// A deadline is set by a statute or published as a guideline, and the
// difference is worth the citizen's money: a section can be quoted in a
// complaint and in a court, a process norm can only be quoted as the
// scheme's own rule.
export const DEADLINE_STATUS = {
  statutory: {
    label: 'Set by law',
    detail:
      'An Act, or a rule made under it, sets this period. It can be quoted in a complaint.',
  },
  guideline: {
    label: 'Published guideline',
    detail:
      'The scheme owner publishes this period. Quote it as the scheme’s own rule, not as law.',
  },
};

export const RUNG_STATUS = {
  statutory: {
    label: 'Created by law',
    detail: 'An Act or the scheme guidelines place this office in the chain.',
  },
  official: {
    label: 'Published by the scheme owner',
    detail: 'The ministry or the scheme portal names this office or window.',
  },
  varies: {
    label: 'Post name varies by state',
    detail:
      'The office exists and does this job, but states name it differently. Ask for the post by the job it does.',
  },
  portal: {
    label: 'Online window',
    detail: 'This step is done on a portal rather than at a counter.',
  },
};

export const LEVELS = [
  { id: 'village', label: 'Village' },
  { id: 'block', label: 'Block' },
  { id: 'district', label: 'District' },
  { id: 'state', label: 'State' },
  { id: 'national', label: 'National' },
];

// The MGNREGA Act 2005 is quoted from the consolidated text the Law
// Department publishes on India Code. That is the text as amended, so the
// Schedule and section numbers in it are the numbers a department reply or
// a court would use. The gazette PDF still on nregaplus.nic.in is the Act
// as it was passed in 2005, and its paragraphs are numbered differently.
const ACT = 'MGNREGA Act 2005, as amended, at indiacode.nic.in';
const MIS = 'nregaplus.nic.in (MGNREGA MIS)';

// A deadline names three things: the provision it comes from, the document
// that provision sits in, and where the document can be read. The clock shows
// all three, because that is the tool's receipt. The letter the citizen
// hands over cites the provision the way a person writes a citation, so the
// two are kept apart here and put together once.
const ACT_DOC = 'MGNREGA Act 2005, as amended';
const ACT_WHERE = 'indiacode.nic.in';
const GRGUIDE_DOC = 'PM-JAY Grievance Redressal Guidelines, January 2019';
const GRGUIDE_WHERE = 'hem.nha.gov.in';
const ABGUIDE_DOC = 'AB-NHPM Operational Guidelines';
const ABGUIDE_WHERE = 'National Health Authority';
const PMK_DOC = 'PM-KISAN Operational Guidelines, revised 21 June 2019';
const PMK_WHERE = 'pmkisan.gov.in';
const PMK_KYC_DOC = 'PM-KISAN note on the modes and processes of e-KYC';
const PMAY_DOC = 'Framework for Implementation of PMAY-G, 2022';
const PMAY_WHERE = 'rh.odisha.gov.in (official copy)';
const SVAN_DOC = 'PM SVANidhi Scheme Guidelines';
const SVAN_WHERE = 'pmsvanidhi.mohua.gov.in';
const ELEC_DOC = 'Electricity (Rights of Consumers) Rules, 2020, as amended in 2024';
const ELEC_WHERE = 'powermin.gov.in';

const provision = (clause, doc, where) => ({
  clause,
  doc,
  where,
  source: `${doc}, ${clause} (${where})`,
});

export const SCHEMES = [
  {
    id: 'mgnrega',
    name: 'MGNREGA',
    full: 'Mahatma Gandhi National Rural Employment Guarantee Act',
    ministry: 'Ministry of Rural Development',
    portal: 'https://nrega.nic.in',
    what: 'A legal right to at least 100 days of wage employment a year for every rural household whose adults volunteer for unskilled manual work.',
    note: 'The only scheme here whose chain is set out in a statute you can read. The sections cited are the Act as amended, as published on India Code.',
    situations: [
      {
        id: 'jobcard',
        label: 'I need a job card',
        complaint: 'I applied for a job card and have not been given one.',
        ask: 'I ask that my job card be issued to me, and that you reply to me in writing.',
        hi: {
          label: 'मुझे जॉब कार्ड चाहिए',
          complaint: 'मैंने जॉब कार्ड के लिए आवेदन किया था, पर मुझे जॉब कार्ड नहीं दिया गया।',
          ask: 'मेरी प्रार्थना है कि मुझे जॉब कार्ड जारी किया जाए और मुझे लिखित उत्तर दिया जाए।',
        },
        rungs: [
          {
            level: 'village',
            office: 'Gram Panchayat',
            post: 'Gram Panchayat Secretary',
            decides:
              'Registers the household and issues the job card with the adult members’ photographs. Registration lasts at least five years.',
            carry: 'Aadhaar of every adult member, ration card, bank passbook',
            where: 'The Gram Panchayat office in your village',
            status: 'statutory',
            source: `${ACT}, Schedule II paragraphs 1-3`,
          },
          {
            level: 'block',
            office: 'Programme Officer at the intermediate Panchayat',
            post: 'Programme Officer, not below the rank of Block Development Officer',
            decides:
              'Matches demand for work to the projects in the block, prepares the block plan, monitors the works, and decides complaints about the Gram Panchayat.',
            carry: 'Job card number, written application for work',
            where: 'The block panchayat or block development office',
            status: 'statutory',
            source: `${ACT}, sections 15(1) and 15(5)`,
          },
          {
            level: 'district',
            office: 'District Programme Coordinator',
            post:
              'Chief Executive Officer of the District Panchayat, or the District Collector, or another district officer of appropriate rank designated by the State',
            decides:
              'Responsible for the scheme in the district: consolidates the block plans into the shelf of projects, sanctions and clears, inspects works, and redresses the grievances of applicants.',
            carry: 'A written complaint, with the date it was first made',
            where: 'The District Collector’s office or the Zila Parishad',
            status: 'statutory',
            source: `${ACT}, sections 14(1) and 14(3)`,
          },
          {
            level: 'state',
            office: 'State Government',
            post: 'State Employment Guarantee Council and the State administration',
            decides:
              'Makes the scheme, staffs it, and is required by law to set grievance mechanisms at block and district level.',
            carry: 'Your complaint history, with the dates the Programme Officer was given it',
            where: 'The State rural development department',
            status: 'statutory',
            source: `${ACT}, sections 4, 18 and 19`,
          },
          {
            level: 'national',
            office: 'Central Employment Guarantee Council',
            post: 'Ministry of Rural Development',
            decides:
              'Regular monitoring and review of implementation, and policy guidance to the States.',
            carry: 'The MIS record of your job card and muster rolls',
            where: 'The MIS officer directory, then the Ministry',
            status: 'official',
            source: `${ACT}, sections 10 and 11; ${MIS}`,
          },
        ],
        // The job card carries its own clock. The Gram Panchayat has to
        // issue it within a fortnight of the application.
        clock: {
          anchors: [
            {
              id: 'applied',
              label: 'The day you applied for the job card',
              sentence: 'I applied for a job card on {date}.',
              hi: { sentence: 'मैंने {date} को जॉब कार्ड के लिए आवेदन किया था।' },
            },
          ],
          deadlines: [
            {
              anchor: 'applied',
              days: 15,
              status: 'statutory',
              what: 'The Gram Panchayat must issue your job card',
              claim:
                'The Gram Panchayat had to issue my job card within fifteen days of my application, by {due}',
              unmet: 'I have not been given my job card.',
              ...provision('Schedule II paragraph 2', ACT_DOC, ACT_WHERE),
              note: 'The card carries the unique job card number, the photographs of the adult members, the bank or post office account number and the insurance policy number.',
              then: 'Ask the Programme Officer, who decides complaints about the Gram Panchayat.',
              hi: {
                claim: 'आवेदन के पंद्रह दिन के भीतर, {due} तक, ग्राम पंचायत को मेरा जॉब कार्ड जारी करना था',
                unmet: 'मुझे अब तक जॉब कार्ड नहीं दिया गया।',
                then: 'कार्यक्रम अधिकारी से शिकायत करें, जो ग्राम पंचायत के बारे में शिकायतों पर निर्णय लेते हैं।',
              },
            },
          ],
        },
      },
      {
        id: 'nowork',
        label: 'I applied for work and got none',
        complaint: 'I asked for work and was not given any.',
        ask: 'I ask that work be given to me, that the unemployment allowance for the days it was not be paid, and that you reply to me in writing.',
        hi: {
          label: 'मैंने काम माँगा, काम नहीं मिला',
          complaint: 'मैंने काम के लिए आवेदन किया, पर मुझे काम नहीं दिया गया।',
          ask: 'मेरी प्रार्थना है कि मुझे काम दिया जाए, जिन दिनों काम नहीं मिला उनके लिए बेरोज़गारी भत्ता दिया जाए, और मुझे लिखित उत्तर दिया जाए।',
        },
        rungs: [
          {
            level: 'village',
            office: 'Gram Panchayat',
            post: 'Gram Panchayat Secretary',
            decides:
              'Allocates employment among the applicants in the village and tells them to report for work. As far as possible the work is to be within five kilometres of where the applicant lives.',
            carry: 'The written application, and any written intimation of work',
            where: 'The Gram Panchayat office',
            status: 'statutory',
            source: `${ACT}, section 16(7) and Schedule II paragraphs 14 and 18`,
          },
          {
            level: 'block',
            office: 'Programme Officer',
            post: 'Programme Officer at the intermediate Panchayat',
            decides:
              'Must give work to every applicant who asks for it, and must sanction and ensure payment of the unemployment allowance when work is not given within fifteen days. A complaint about the Gram Panchayat goes here, and must be disposed of within seven days.',
            carry: 'Your application, the date you gave it, and the written complaint',
            where: 'The block panchayat or block development office',
            status: 'statutory',
            source: `${ACT}, sections 7(1), 15(5)(b) and 23(5)-(6)`,
          },
          {
            level: 'district',
            office: 'District Programme Coordinator',
            post: 'District Programme Coordinator',
            decides:
              'Ensures applicants are given the employment they are entitled to, and redresses their grievances.',
            carry: 'A note of the Programme Officer’s reply, or of its absence',
            where: 'The District Collector’s office or the Zila Parishad',
            status: 'statutory',
            source: `${ACT}, section 14(3)(d) and 14(3)(g)`,
          },
          {
            level: 'state',
            office: 'State Government',
            post: 'State Employment Guarantee Council',
            decides:
              'Sets the block and district grievance machinery that the Act requires it to create.',
            carry: 'Everything below, in order',
            where: 'The State rural development department',
            status: 'statutory',
            source: `${ACT}, section 19`,
          },
          {
            level: 'national',
            office: 'Ministry of Rural Development',
            post: 'Ministry of Rural Development',
            decides:
              'Monitors implementation through the Central Council and the MIS.',
            carry: 'The MIS record of your job card, muster rolls and payments',
            where: 'The MIS officer directory for your district and block',
            status: 'official',
            source: `${ACT}, sections 10-11; ${MIS}`,
          },
        ],
        // The clock, where the Act sets one. Each deadline counts from a
        // date the citizen gives, and each one says what to do once it has
        // passed.
        clock: {
          anchors: [
            { id: 'applied', label: 'The day you applied for work', sentence: 'I applied for work on {date}.', hi: { sentence: 'मैंने {date} को काम के लिए आवेदन किया था।' } },
            { id: 'complained', label: 'The day you complained to the office', sentence: 'I complained to the office on {date}.', hi: { sentence: 'मैंने {date} को कार्यालय में शिकायत की थी।' } },
          ],
          deadlines: [
            {
              anchor: 'applied',
              days: 15,
              status: 'statutory',
              what: 'Work must be provided to you',
              claim:
                'I was to be given work within fifteen days of my application, by {due}',
              unmet: 'I have not been given work.',
              ...provision('section 7(1) and Schedule II paragraph 14', ACT_DOC, ACT_WHERE),
              note: 'Both the Gram Panchayat and the Programme Officer are bound to see that it is.',
              then: 'Ask the Programme Officer for the unemployment allowance, which the Act makes due from the day the work was not given.',
              hi: {
                claim: 'आवेदन के पंद्रह दिन के भीतर, {due} तक, मुझे काम दिया जाना था',
                unmet: 'मुझे काम नहीं दिया गया।',
                then: 'कार्यक्रम अधिकारी से बेरोज़गारी भत्ते की माँग करें, जो काम न मिलने के दिन से देय है।',
              },
            },
            {
              anchor: 'complained',
              days: 7,
              status: 'statutory',
              what: 'The Programme Officer must dispose of your complaint',
              claim:
                'The Programme Officer had to dispose of my complaint within seven days of receiving it, by {due}',
              unmet: 'I have not received an answer to my complaint.',
              ...provision('sections 23(5) and 23(6), and Schedule I paragraph 29', ACT_DOC, ACT_WHERE),
              note: 'The complaint has to reach the Programme Officer: a complaint about the Gram Panchayat is referred there by law. The Scheme also says the grievance has to be redressed within 15 days of the enquiry being completed.',
              then: 'Take it to the District Programme Coordinator, who is bound to redress the grievance.',
              hi: {
                claim: 'कार्यक्रम अधिकारी को मेरी शिकायत मिलने के सात दिन के भीतर, {due} तक, उसका निपटारा करना था',
                unmet: 'मेरी शिकायत का कोई उत्तर नहीं मिला।',
                then: 'जिला कार्यक्रम समन्वयक के पास जाएँ, जो शिकायत का निपटारा करने के लिए बाध्य हैं।',
              },
            },
            {
              anchor: 'applied',
              days: 30,
              status: 'statutory',
              what: 'The unemployment allowance must be paid or offered',
              claim:
                'The unemployment allowance became due to me fifteen days after my application, and had to be paid or offered within fifteen days of that day, by {due}',
              unmet: 'I have not been paid the unemployment allowance.',
              ...provision('sections 7(1), 7(4) and 7(5)', ACT_DOC, ACT_WHERE),
              note: 'Fifteen days to be given work, then fifteen more from the day the allowance became due.',
              then: 'Ask the Programme Officer to sanction and pay it, and put the request in writing. The Act makes the State bear the cost.',
              hi: {
                claim: 'बेरोज़गारी भत्ता आवेदन के पंद्रह दिन बाद देय हुआ, और उस दिन के पंद्रह दिन के भीतर, {due} तक, उसे दिया या देय बताया जाना था',
                unmet: 'मुझे बेरोज़गारी भत्ता नहीं दिया गया।',
                then: 'कार्यक्रम अधिकारी से इसे स्वीकृत कर भुगतान करने की लिखित माँग करें।',
              },
            },
          ],
        },
      },
      {
        id: 'wages',
        label: 'My wages were not paid',
        complaint: 'I did the work and my wages were not paid.',
        ask: 'I ask that my wages be paid, that the compensation for the delay be paid with them, and that you reply to me in writing.',
        hi: {
          label: 'मेरी मज़दूरी नहीं मिली',
          complaint: 'मैंने काम किया, पर मेरी मज़दूरी नहीं दी गई।',
          ask: 'मेरी प्रार्थना है कि मेरी मज़दूरी दी जाए, विलंब का मुआवज़ा उसके साथ दिया जाए, और मुझे लिखित उत्तर दिया जाए।',
        },
        rungs: [
          {
            level: 'village',
            office: 'Gram Panchayat',
            post: 'Gram Panchayat Secretary',
            decides:
              'Holds the muster roll and the measurement book for the works in the village, and must make them available to the Gram Sabha for social audit. The measurements have to be taken within three days of the muster roll being closed.',
            carry: 'The muster roll page, the work dates, and any receipt',
            where: 'The Gram Panchayat office',
            status: 'statutory',
            source: `${ACT}, section 17(3) and Schedule I paragraphs 15 and 16`,
          },
          {
            level: 'block',
            office: 'Programme Officer',
            post: 'Programme Officer at the intermediate Panchayat',
            decides:
              'Ensures prompt and fair payment of wages to every labourer in the block, and keeps a register of complaints. The State has to split the payment into stages, name the officer answerable for each stage, and set a time limit for each.',
            carry: 'The muster roll, the bank passbook, the work dates',
            where: 'The block panchayat or block development office',
            status: 'statutory',
            source: `${ACT}, section 15(5)(c) and 23(6), and Schedule II paragraph 29(1)(b)`,
          },
          {
            level: 'district',
            office: 'District Programme Coordinator',
            post: 'District Programme Coordinator',
            decides:
              'Supervises the Programme Officers and inspects the works in progress.',
            carry: 'The block’s reply, or the absence of one',
            where: 'The District Collector’s office',
            status: 'statutory',
            source: `${ACT}, section 14(3)(e)-(f)`,
          },
          {
            level: 'state',
            office: 'State Government',
            post: 'State Employment Guarantee Council',
            decides:
              'Oversees the scheme and the wage payments across the State.',
            carry: 'Everything below, in order',
            where: 'The State rural development department',
            status: 'statutory',
            source: `${ACT}, section 12 and 18`,
          },
          {
            level: 'national',
            office: 'Ministry of Rural Development',
            post: 'Ministry of Rural Development',
            decides: 'Monitors payment through the Central Council and the MIS.',
            carry: 'The MIS record of your payments',
            where: 'The MIS officer directory for your district and block',
            status: 'official',
            source: `${ACT}, sections 10-11; ${MIS}`,
          },
        ],
        // The Act sets a clock for the wages themselves. The muster roll is
        // closed when the work period ends, and the wages are to be paid
        // within a fortnight of that. After the sixteenth day the delay has
        // to be paid for.
        clock: {
          anchors: [
            {
              id: 'closed',
              label: 'The day the muster roll was closed',
              sentence: 'The muster roll for the work I did was closed on {date}.',
              hi: { sentence: 'जिस काम पर मैंने काम किया, उसका मस्टर रोल {date} को बंद हुआ था।' },
            },
          ],
          deadlines: [
            {
              anchor: 'closed',
              days: 15,
              status: 'statutory',
              what: 'The wages must be paid',
              claim:
                'My wages were to be paid within fifteen days of the muster roll being closed, by {due}',
              unmet: 'My wages have not been paid.',
              ...provision('Schedule II paragraph 29(1)', ACT_DOC, ACT_WHERE),
              note: 'The Act says the wages are to be paid within fifteen days of the muster roll being closed.',
              then: 'Ask the Programme Officer for the payment, with the muster roll page and your bank passbook.',
              hi: {
                claim: 'मस्टर रोल बंद होने के पंद्रह दिन के भीतर, {due} तक, मेरी मज़दूरी देनी थी',
                unmet: 'मेरी मज़दूरी नहीं दी गई।',
                then: 'मस्टर रोल की प्रति और बैंक पासबुक के साथ कार्यक्रम अधिकारी से भुगतान की माँग करें।',
              },
            },
            {
              anchor: 'closed',
              days: 16,
              status: 'statutory',
              what: 'The day after which the delay has to be paid for',
              claim:
                'I was owed compensation of 0.05 per cent of the unpaid wages for every day of delay from the seventeenth day, which fell on {due}',
              unmet: 'I have not been paid the compensation.',
              ...provision('Schedule II paragraph 29(1) and 29(1)(a)', ACT_DOC, ACT_WHERE),
              note: 'After the sixteenth day the Act adds 0.05 per cent of the unpaid wages for every day of delay. A delay in paying that compensation counts in the same way.',
              then: 'Claim the compensation along with the wages, in writing to the Programme Officer, and keep the muster roll page with it.',
              hi: {
                claim: 'सत्रहवें दिन से हर दिन की देरी पर बकाया मज़दूरी का 0.05 प्रतिशत मुआवज़ा मुझे देय था, जिसकी तिथि {due} थी',
                unmet: 'मुझे यह मुआवज़ा नहीं दिया गया।',
                then: 'मज़दूरी के साथ मुआवज़े की माँग कार्यक्रम अधिकारी को लिखित रूप में करें और मस्टर रोल की प्रति रखें।',
              },
            },
          ],
        },
      },
    ],
  },
  {
    id: 'jjm',
    name: 'Jal Jeevan Mission',
    full: 'Jal Jeevan Mission',
    ministry: 'Ministry of Jal Shakti, Department of Drinking Water and Sanitation',
    portal: 'https://jaljeevanmission.gov.in',
    what: 'A functional household tap connection to every rural home, with the village community running the system.',
    note: 'The mission sets out four tiers: national, state, district and village. There is no block tier in its institutional mechanism, though states run block resource centres for other schemes.',
    situations: [
      {
        id: 'notap',
        label: 'My village has no tap water',
        complaint: 'My village has no tap water.',
        ask: 'I ask that a tap connection be given to my household, and that you reply to me in writing.',
        // The mission publishes no period for a household connection. The
        // record says what was checked, so an empty clock is a finding and
        // not an omission.
        clockGap:
          'The Jal Jeevan Mission Operational Guidelines (2019) set no period for a household tap connection. Uttarakhand’s Right to Service schedule lists a new water connection, but its time limit could not be read from the official copy.',
        rungs: [
          {
            level: 'village',
            office: 'Gram Panchayat or its subcommittee',
            post:
              'Village Water and Sanitation Committee, Paani Samiti or User Group. The Gram Sabha decides whether the Panchayat or a subcommittee runs water supply, and the Panchayat Secretary, Patwari or Talati may act as its secretary.',
            decides:
              'Leads the planning, implementation, management and operation of the in-village water supply system. A Gram Sabha resolution and the community’s willingness are the first criterion for planning.',
            carry: 'The Gram Sabha resolution, if one exists',
            where: 'The Gram Panchayat office',
            status: 'official',
            source: 'jaljeevanmission.gov.in/institutional-bodies-content',
          },
          {
            level: 'block',
            office: 'Block office',
            post: 'Block Resource Centre or block water and sanitation staff, where the State runs one',
            decides:
              'Executes the works in the block. The mission’s own institutional mechanism does not set out a block body, so the local name has to be confirmed.',
            carry: 'The Gram Panchayat’s request, in writing',
            where: 'The block development office',
            status: 'varies',
            source: 'jaljeevanmission.gov.in/institutional-bodies-content (four tiers only: national, state, district, village)',
          },
          {
            level: 'district',
            office: 'District Water and Sanitation Mission',
            post:
              'Chaired by the Deputy Commissioner or District Collector. The Executive Engineer of the Public Health Engineering Department or the Rural Water Supply Department is Member-Secretary.',
            decides:
              'Gives administrative approval to in-village water supply schemes, plans protection of village water sources, and handles greywater management. It meets monthly and prepares the district annual action plan.',
            carry: 'The village request, with the Gram Sabha resolution',
            where: 'The District Collector’s office',
            status: 'official',
            source: 'jaljeevanmission.gov.in/institutional-bodies-content',
          },
          {
            level: 'state',
            office: 'State Water and Sanitation Mission',
            post:
              'Headed by the Chief Secretary. The Principal Secretary or Secretary in charge of the Public Health Engineering Department or the Rural Water Supply Department is the Mission Director.',
            decides:
              'Responsible for implementing the mission in the State, with the powers the State Government gives it.',
            carry: 'The district’s reply, or its absence',
            where: 'The State Public Health Engineering or Rural Water Supply department',
            status: 'official',
            source: 'jaljeevanmission.gov.in/institutional-bodies-content',
          },
          {
            level: 'national',
            office: 'National Jal Jeevan Mission',
            post: 'Department of Drinking Water and Sanitation, Ministry of Jal Shakti',
            decides:
              'Policy guidance, financial and technical support to the States, monitoring and corrective action, and approval of State annual action plans. It also runs the Rashtriya Jal Jeevan Kosh.',
            carry: 'The State annual action plan, if you are asking why your village is not in it',
            where: 'jaljeevanmission.gov.in',
            status: 'official',
            source: 'jaljeevanmission.gov.in/institutional-bodies-content and /national_jal_jeevan_mission',
          },
        ],
      },
      {
        id: 'quality',
        label: 'The water is not safe to drink',
        complaint: 'The water my village gets is not safe to drink.',
        ask: 'I ask that the water be tested, that it be made safe, and that you reply to me in writing.',
        clockGap:
          'The Jal Jeevan Mission Operational Guidelines (2019) set no period for a water-quality complaint or for testing a source. Its water-quality framework sets a 24-hour limit for carrying a sample to a laboratory, which is not a deadline to act on the complaint.',
        rungs: [
          {
            level: 'village',
            office: 'Gram Panchayat or its subcommittee',
            post: 'Village Water and Sanitation Committee or Paani Samiti',
            decides:
              'Runs and maintains the system, and is the body that first hears a complaint about the water it supplies.',
            carry: 'A written complaint, with the date',
            where: 'The Gram Panchayat office',
            status: 'official',
            source: 'jaljeevanmission.gov.in/institutional-bodies-content',
          },
          {
            level: 'block',
            office: 'Block office',
            post: 'Block water and sanitation staff, where the State runs one',
            decides:
              'Holds the water quality monitoring and surveillance work in the block in some States. The mission page names that role at district level, not block.',
            carry: 'The village complaint',
            where: 'The block development office',
            status: 'varies',
            source: 'jaljeevanmission.gov.in/institutional-bodies-content',
          },
          {
            level: 'district',
            office: 'District Water and Sanitation Mission',
            post:
              'Chair: Deputy Commissioner or District Collector. The mission carries a coordinator for water quality monitoring and surveillance, and the Executive Engineer of PHED or RWS is Member-Secretary.',
            decides:
              'Plans protection and preservation of village water sources, and prevents water bodies and sources from being polluted. This is the level at which water quality coordination sits.',
            carry: 'The village complaint and the dates',
            where: 'The District Collector’s office',
            status: 'official',
            source: 'jaljeevanmission.gov.in/institutional-bodies-content',
          },
          {
            level: 'state',
            office: 'State Water and Sanitation Mission',
            post: 'Headed by the Chief Secretary, with the PHED or RWS Secretary as Mission Director',
            decides: 'Coordinates the State response and the technical support.',
            carry: 'The district’s reply',
            where: 'The State PHED or RWS department',
            status: 'official',
            source: 'jaljeevanmission.gov.in/institutional-bodies-content',
          },
          {
            level: 'national',
            office: 'National Jal Jeevan Mission',
            post: 'Department of Drinking Water and Sanitation, Ministry of Jal Shakti',
            decides:
              'Policy guidance, technical support, monitoring and corrective action across the States.',
            carry: 'The State’s reply',
            where: 'jaljeevanmission.gov.in',
            status: 'official',
            source: 'jaljeevanmission.gov.in/institutional-bodies-content',
          },
        ],
      },
    ],
  },
  {
    id: 'pmkisan',
    name: 'PM-KISAN',
    full: 'Pradhan Mantri Kisan Samman Nidhi',
    ministry: 'Ministry of Agriculture and Farmers Welfare',
    portal: 'https://pmkisan.gov.in',
    what: 'Income support of Rs 6,000 a year to landholding farmer families, paid in three equal instalments.',
    note: 'The portal publishes a grievance form and a State nodal officer search. The local posts that check a land record are named differently by each State, so those rungs are marked as varying.',
    situations: [
      {
        id: 'notregistered',
        label: 'I am not registered, or my e-KYC is stuck',
        complaint: 'I am not registered, or my e-KYC has not gone through.',
        ask: 'I ask that my registration be completed, or that my e-KYC be fixed, and that you reply to me in writing.',
        hi: {
          label: 'मैं पंजीकृत नहीं हूँ, या मेरा ई-केवाईसी अटका है',
          complaint: 'मैं पंजीकृत नहीं हूँ, या मेरा ई-केवाईसी पूरा नहीं हुआ है।',
          ask: 'मेरी प्रार्थना है कि मेरा पंजीकरण पूरा किया जाए, या मेरा ई-केवाईसी ठीक किया जाए, और मुझे लिखित उत्तर दिया जाए।',
        },
        rungs: [
          {
            level: 'village',
            office: 'Village revenue office',
            post: 'Patwari, Village Revenue Officer or equivalent',
            decides:
              'Holds the land record. The farmer’s name, holding and status are read from it, so an error here stops the payment.',
            carry: 'Aadhaar, the land holding record or khatauni, the bank passbook',
            where: 'The village revenue office, or the Block Revenue office',
            status: 'varies',
            source: 'pmkisan.gov.in operational guidelines and revised FAQ (the land-record step sits with the State revenue department)',
          },
          {
            level: 'block',
            office: 'Block agriculture or revenue office',
            post: 'Block Agriculture Officer or Block Revenue Officer',
            decides:
              'Corrects the record the State portal carries, and forwards the corrected holding to the State node.',
            carry: 'The corrected land record, the application receipt',
            where: 'The block office',
            status: 'varies',
            source: 'pmkisan.gov.in operational guidelines and revised FAQ',
          },
          {
            level: 'district',
            office: 'District agriculture office',
            post: 'District Agriculture Officer',
            decides:
              'Checks the farmer record and the eligibility of the holding for the State node.',
            carry: 'The block’s reply',
            where: 'The District Collector’s office, or the district agriculture office',
            status: 'varies',
            source: 'pmkisan.gov.in operational guidelines and revised FAQ',
          },
          {
            level: 'state',
            office: 'State nodal office',
            post: 'State Nodal Officer for PM-KISAN',
            decides:
              'Runs the State farmer database and the State share of the payment. The portal publishes a State nodal contact search.',
            carry: 'Farmer’s registration number, Aadhaar, bank passbook',
            where: 'The State nodal officer listed on the PM-KISAN portal',
            status: 'official',
            source: 'pmkisan.gov.in/SearchSNODetails.aspx',
          },
          {
            level: 'national',
            office: 'PM-KISAN portal',
            post: 'Ministry of Agriculture and Farmers Welfare',
            decides:
              'Holds the national farmer database, and runs the grievance form. A complaint filed here is tracked with a reference.',
            carry: 'The registration number and the bank passbook',
            where: 'pmkisan.gov.in/grievance.aspx',
            status: 'portal',
            source: 'pmkisan.gov.in/grievance.aspx',
          },
        ],
        // The portal note gives one period a farmer can hold the office to:
        // the result of an e-KYC has to show in the beneficiary status after
        // twenty-four hours. The guidelines set no period for the land-record
        // check that follows, so none is claimed here.
        clock: {
          anchors: [
            {
              id: 'ekyc',
              label: 'The day you completed e-KYC',
              sentence: 'I completed e-KYC on {date}.',
              hi: { sentence: 'मैंने {date} को ई-केवाईसी पूरा किया था।' },
            },
          ],
          deadlines: [
            {
              anchor: 'ekyc',
              hours: 24,
              status: 'guideline',
              what: 'Your e-KYC result must show in your beneficiary status',
              claim:
                'My e-KYC result had to show in my beneficiary status within twenty-four hours of my e-KYC, by {due}',
              unmet: 'My beneficiary status still does not show the e-KYC result.',
              hi: {
                claim:
                  'मेरे ई-केवाईसी का परिणाम चौबीस घंटे के भीतर, {due} तक, मेरी लाभार्थी स्थिति में दिखना चाहिए था',
                unmet: 'मेरी लाभार्थी स्थिति में अब तक ई-केवाईसी का परिणाम नहीं दिख रहा है।',
              },
              ...provision('the status note', PMK_KYC_DOC, PMK_WHERE),
              note: 'The note reads: the status of the e-KYC done through any mode will be reflected in the beneficiary status after 24 hours. The guidelines set no period for the land-record verification that follows, so this date covers the status entry only.',
              then: 'Ask the State nodal officer to have the e-KYC record checked, and carry the date you completed it.',
            },
          ],
        },
      },
      {
        id: 'nocredit',
        label: 'An instalment did not come',
        complaint: 'The instalment has not come into my account.',
        ask: 'I ask that the instalment be paid to me, and that you reply to me in writing.',
        hi: {
          label: 'एक किस्त नहीं आई',
          complaint: 'मेरी किस्त मेरे खाते में नहीं आई है।',
          ask: 'मेरी प्रार्थना है कि मुझे किस्त का भुगतान किया जाए, और मुझे लिखित उत्तर दिया जाए।',
        },
        rungs: [
          {
            level: 'village',
            office: 'Village revenue office',
            post: 'Patwari or Village Revenue Officer',
            decides:
              'Confirms whether the holding is still in your name and unchanged, which is the most common reason a name is dropped from a payment list.',
            carry: 'The land record, the Aadhaar, the passbook',
            where: 'The village revenue office',
            status: 'varies',
            source: 'pmkisan.gov.in operational guidelines and revised FAQ',
          },
          {
            level: 'block',
            office: 'Block agriculture office',
            post: 'Block Agriculture Officer',
            decides:
              'Checks why the name was excluded and puts it back if it is a correctable error.',
            carry: 'The exclusion notice, if you have one',
            where: 'The block office',
            status: 'varies',
            source: 'pmkisan.gov.in operational guidelines and revised FAQ',
          },
          {
            level: 'district',
            office: 'District agriculture office',
            post: 'District Agriculture Officer',
            decides: 'Rechecks the farmer record and the eligibility of the holding.',
            carry: 'The block’s reply',
            where: 'The district agriculture office',
            status: 'varies',
            source: 'pmkisan.gov.in operational guidelines and revised FAQ',
          },
          {
            level: 'state',
            office: 'State nodal office',
            post: 'State Nodal Officer for PM-KISAN',
            decides: 'Authorises the State payment file for the instalment.',
            carry: 'The farmer record, the Aadhaar, the passbook',
            where: 'The State nodal officer listed on the PM-KISAN portal',
            status: 'official',
            source: 'pmkisan.gov.in/SearchSNODetails.aspx',
          },
          {
            level: 'national',
            office: 'PM-KISAN portal',
            post: 'Ministry of Agriculture and Farmers Welfare',
            decides:
              'Triggers the instalment and carries the national grievance form.',
            carry: 'The registration number, the passbook, the bank statement',
            where: 'pmkisan.gov.in/grievance.aspx',
            status: 'portal',
            source: 'pmkisan.gov.in/grievance.aspx',
          },
        ],
        // The guidelines ask for a grievance to be disposed of on merit
        // "preferably within two weeks". The source carries the word
        // preferably, so the clock repeats it rather than turning a target
        // into a guarantee.
        clock: {
          anchors: [
            {
              id: 'complained',
              label: 'The day you complained to the State or national office',
              sentence: 'I complained to the office on {date}.',
              hi: { sentence: 'मैंने {date} को कार्यालय में शिकायत की थी।' },
            },
          ],
          deadlines: [
            {
              anchor: 'complained',
              days: 14,
              status: 'guideline',
              what: 'Your grievance must be disposed of on merit',
              claim:
                'Under the scheme guidelines my grievance had to be disposed of on merit, preferably within two weeks of my complaint, by {due}',
              unmet: 'My grievance has not been disposed of.',
              hi: {
                claim:
                  'योजना के दिशानिर्देशों के अनुसार मेरी शिकायत को गुण-दोष के आधार पर, अधिमानतः दो सप्ताह के भीतर, {due} तक निपटाया जाना चाहिए था',
                unmet: 'मेरी शिकायत अब तक निपटाई नहीं गई है।',
              },
              ...provision('section 7, grievance mechanism', PMK_DOC, PMK_WHERE),
              note: 'The guidelines say a grievance received should be disposed of on merit "preferably within two weeks". They fix no period for the instalment itself: the scheme pays three instalments a year, one every four months, and no rule says which day a particular farmer must be credited.',
              then: 'Send the complaint number and the date to the State nodal officer, then to the national grievance cell on the portal.',
            },
          ],
        },
      },
    ],
  },
  {
    id: 'pmjay',
    name: 'PM-JAY',
    full: 'Ayushman Bharat Pradhan Mantri Jan Arogya Yojana',
    ministry: 'National Health Authority, Ministry of Health and Family Welfare',
    portal: 'https://pmjay.gov.in',
    what: 'Health cover of up to Rs 5 lakh a year a family can use at any empanelled hospital, with no payment at the point of care.',
    note: 'The national grievance route is the CGRMS portal, which issues a Unique Ticket Number. The State office that answers depends on which State Health Agency runs the scheme.',
    situations: [
      {
        id: 'card',
        label: 'I cannot make or use my card',
        complaint: 'I cannot make my card, or I cannot use it for treatment.',
        ask: 'I ask that my card be made, or returned to me if the hospital has kept it, and that you reply to me in writing.',
        hi: {
          label: 'कार्ड बनाने या उपयोग करने में बाधा',
          complaint: 'मेरा कार्ड नहीं बन रहा है, या अस्पताल में उसका उपयोग नहीं हो पा रहा है।',
          ask: 'मेरी प्रार्थना है कि मेरा कार्ड बनाया जाए, या अस्पताल ने रोक रखा है तो वह वापस दिया जाए, और मुझे लिखित उत्तर दिया जाए।',
        },
        rungs: [
          {
            level: 'village',
            office: 'Common Service Centre or empanelled hospital helpdesk',
            post: 'Ayushman Mitra',
            decides:
              'Helps create the card and the family record. The Mitra helps with the form; the State Health Agency decides the record.',
            carry: 'Aadhaar, ration card, the family’s identity documents',
            where: 'The nearest CSC, or the helpdesk of an empanelled hospital',
            status: 'official',
            source: 'support.pmjay.gov.in; cgrms.pmjay.gov.in',
          },
          {
            level: 'block',
            office: 'Block facilitation centre',
            post: 'Block Ayushman Coordinator, where the State runs one',
            decides:
              'Resolves card creation and identity problems that the CSC could not close.',
            carry: 'The rejection message, the CSC receipt',
            where: 'The block health office',
            status: 'varies',
            source: 'hem.nha.gov.in Grievance Redressal Guidelines (district and block roles are State-specific)',
          },
          {
            level: 'district',
            office: 'State Health Agency field office',
            post: 'District Nodal Officer for PM-JAY',
            decides:
              'Owns the beneficiary record for the district, and can add a family member that was wrongly left out.',
            carry: 'The CSC receipt, the rejection message, the family documents',
            where: 'The district health office',
            status: 'varies',
            source: 'dgmh.up.gov.in/en/Contactus (State nodal officer example)',
          },
          {
            level: 'state',
            office: 'State Health Agency',
            post: 'State Grievance Nodal Officer',
            decides:
              'Owns the State beneficiary list and the claim policy, and runs the State’s appeal on a card or claim dispute.',
            carry: 'The case number from the lower office',
            where: 'The State SHA, or the helpline 14555 for the State number',
            status: 'official',
            source: 'ma.gujarat.gov.in/Contact%20SNC%20Officials.html; dgmh.up.gov.in/en/Contactus',
          },
          {
            level: 'national',
            office: 'Central Grievance Redressal Management System',
            post: 'National Health Authority',
            decides:
              'Takes the grievance when the State has not closed it, and issues a Unique Ticket Number that every follow-up quotes.',
            carry: 'The Unique Ticket Number, the pre-authorisation number, the written denial',
            where: 'cgrms.pmjay.gov.in',
            status: 'portal',
            source: 'cgrms.pmjay.gov.in; support.pmjay.gov.in',
          },
        ],
        clock: {
          anchors: [
            { id: 'grieved', label: 'The day you registered the grievance', sentence: 'I registered the grievance on {date}.', hi: { sentence: 'मैंने {date} को शिकायत दर्ज की थी।' } },
            { id: 'decided', label: 'The day you got the decision', sentence: 'I got the decision on {date}.', hi: { sentence: 'मुझे {date} को निर्णय मिला था।' } },
          ],
          deadlines: [
            {
              anchor: 'grieved',
              hours: 48,
              status: 'guideline',
              what: 'The grievance must be resolved',
              claim:
                'My grievance was to be resolved within 48 hours of it being received, by {due}',
              unmet: 'I have not received a reply to my grievance.',
              ...provision('section 7.2', GRGUIDE_DOC, GRGUIDE_WHERE),
              note: 'If your complaint is about your eligibility or about a denial of service, the guidelines say it has to be resolved within 48 hours of the complaint being received.',
              then: 'Ask the District Nodal Officer to take the case up, and quote the Unique Ticket Number.',
              hi: {
                claim: 'मेरी शिकायत मिलने के 48 घंटे के भीतर, {due} तक, उसका समाधान करना था',
                unmet: 'मेरी शिकायत का कोई उत्तर नहीं मिला।',
                then: 'जिला नोडल अधिकारी से मामला उठाने को कहें और यूनिक टिकट नंबर बताएँ।',
              },
            },
            {
              anchor: 'grieved',
              days: 30,
              status: 'guideline',
              what: 'The District or State Grievance Nodal Officer must resolve it',
              claim:
                'The District or State Grievance Nodal Officer had 30 days from the receipt of my grievance to resolve it, by {due}',
              unmet: 'I have not received a resolution of my grievance.',
              ...provision('Table 1', GRGUIDE_DOC, GRGUIDE_WHERE),
              note: 'For a card the hospital kept, or a card that was never made, the guidelines give that officer 30 days from the receipt of the grievance.',
              then: 'If it is not resolved in 30 days, ask for it to be moved to the Grievance Redressal Committee, and keep the Unique Ticket Number.',
              hi: {
                claim: 'जिला या राज्य शिकायत नोडल अधिकारी के पास मेरी शिकायत मिलने से 30 दिन के भीतर, {due} तक, उसका समाधान करना था',
                unmet: 'मेरी शिकायत का समाधान नहीं हुआ।',
                then: '30 दिन में समाधान न हो तो शिकायत समाधान समिति के पास भेजने को कहें और यूनिक टिकट नंबर रखें।',
              },
            },
            {
              anchor: 'grieved',
              days: 30,
              status: 'guideline',
              what: 'The Grievance Redressal Committee must decide the matter',
              claim:
                'The Grievance Redressal Committee had 30 days from the receipt of my grievance to decide it, by {due}',
              unmet: 'I have not received a decision on my grievance.',
              ...provision('sections 9.3.3 and 9.3.4', GRGUIDE_DOC, GRGUIDE_WHERE),
              note: 'Thirty days from the receipt of the grievance.',
              then: 'Keep the Unique Ticket Number. Every further step quotes it.',
              hi: {
                claim: 'शिकायत समाधान समिति के पास मेरी शिकायत मिलने से 30 दिन के भीतर, {due} तक, उस पर निर्णय लेना था',
                unmet: 'मेरी शिकायत पर निर्णय नहीं मिला।',
                then: 'यूनिक टिकट नंबर रखें। आगे की हर कार्रवाई में वही उद्धृत होता है।',
              },
            },
            {
              anchor: 'decided',
              days: 30,
              status: 'guideline',
              what: 'You must file your appeal, or you lose the right to appeal',
              claim:
                'I had 30 days from the decision to file my appeal, by {due}',
              unmet: 'The time to file my appeal has run out.',
              ...provision('sections 9.3.5 and 9.3.6', GRGUIDE_DOC, GRGUIDE_WHERE),
              note: 'The appeal goes to the committee with powers of appeal, within 30 days of the decision. Miss the 30 days and the decision becomes final and binding.',
              then: 'File the appeal on CGRMS within the 30 days and keep the acknowledgement.',
              hi: {
                claim: 'निर्णय से 30 दिन के भीतर, {due} तक, मुझे अपनी अपील दर्ज करनी थी',
                unmet: 'अपील दर्ज करने का समय बीत गया।',
                then: '30 दिन के भीतर CGRMS पर अपील दर्ज करें और पावती रखें।',
              },
            },
          ],
        },
      },
      {
        id: 'refused',
        label: 'The hospital refused to treat me',
        complaint: 'The hospital refused to treat me.',
        ask: 'I ask that the hospital be directed to treat me, that my claim be settled, and that you reply to me in writing.',
        hi: {
          label: 'अस्पताल ने इलाज से मना किया',
          complaint: 'अस्पताल ने मेरा इलाज करने से मना कर दिया।',
          ask: 'मेरी प्रार्थना है कि अस्पताल को मेरा इलाज करने का निर्देश दिया जाए, मेरा क्लेम निपटाया जाए, और मुझे लिखित उत्तर दिया जाए।',
        },
        rungs: [
          {
            level: 'village',
            office: 'Empanelled hospital helpdesk',
            post: 'Ayushman Mitra',
            decides:
              'Refuses or delays treatment. A refusal must be recorded in writing, with a reason and the pre-authorisation reference.',
            carry: 'The card, the pre-authorisation number, the admission record',
            where: 'The hospital helpdesk, before you leave',
            status: 'official',
            source: 'support.pmjay.gov.in',
          },
          {
            level: 'block',
            office: 'Block facilitation centre',
            post: 'Block Ayushman Coordinator, where the State runs one',
            decides:
              'Steps in where the hospital would not treat the patient. The block role is State-specific.',
            carry: 'The written denial',
            where: 'The block health office',
            status: 'varies',
            source: 'cgrms.pmjay.gov.in grievance guidelines (State-specific roles)',
          },
          {
            level: 'district',
            office: 'State Health Agency field office',
            post: 'District Nodal Officer for PM-JAY',
            decides:
              'Reports a hospital that refuses patients, and handles the case where the benefit was wrongly stopped.',
            carry: 'The written denial, the date, the ward',
            where: 'The district health office',
            status: 'varies',
            source: 'dgmh.up.gov.in/en/Contactus',
          },
          {
            level: 'state',
            office: 'State Health Agency',
            post: 'State Grievance Nodal Officer',
            decides:
              'Settles the claim dispute with the hospital and the insurer, and escalates the access failure.',
            carry: 'The pre-authorisation number and the written denial',
            where: 'The State SHA, or the helpline 14555',
            status: 'official',
            source: 'ma.gujarat.gov.in/Contact%20SNC%20Officials.html; dgmh.up.gov.in/en/Contactus',
          },
          {
            level: 'national',
            office: 'Central Grievance Redressal Management System',
            post: 'National Health Authority',
            decides:
              'Takes the unresolved case and tracks it with a Unique Ticket Number.',
            carry: 'The Unique Ticket Number, the pre-authorisation number, the written denial',
            where: 'cgrms.pmjay.gov.in',
            status: 'portal',
            source: 'cgrms.pmjay.gov.in',
          },
        ],
        clock: {
          anchors: [
            { id: 'asked', label: 'The day the hospital asked for pre-authorisation', sentence: 'The hospital asked for pre-authorisation on {date}.', hi: { sentence: 'अस्पताल ने {date} को पूर्व-प्राधिकरण (pre-authorisation) माँगा था।' } },
            { id: 'complained', label: 'The day you complained at the hospital', sentence: 'I complained at the hospital on {date}.', hi: { sentence: 'मैंने {date} को अस्पताल में शिकायत की थी।' } },
            { id: 'grieved', label: 'The day you registered the grievance', sentence: 'I registered the grievance on {date}.', hi: { sentence: 'मैंने {date} को शिकायत दर्ज की थी।' } },
            { id: 'decided', label: 'The day you got the decision', sentence: 'I got the decision on {date}.', hi: { sentence: 'मुझे {date} को निर्णय मिला था।' } },
          ],
          deadlines: [
            {
              anchor: 'asked',
              hours: 6,
              status: 'guideline',
              what: 'The insurer must answer the pre-authorisation request',
              claim:
                'The insurer had 6 hours to approve or reject the pre-authorisation request for my treatment, by {due}',
              unmet: 'My pre-authorisation request was not answered in time.',
              ...provision('sections 4.5(G) and 4.5(H)', ABGUIDE_DOC, ABGUIDE_WHERE),
              note: 'If the insurer neither approves nor rejects within 6 hours, the request counts as approved by default. In an emergency the code can come over the phone, and the papers follow.',
              then: 'Ask the Ayushman Mitra for the pre-authorisation number in writing before you leave.',
              hi: {
                claim: 'मेरे इलाज के पूर्व-प्राधिकरण अनुरोध पर बीमाकर्ता को 6 घंटे के भीतर, {due} तक, निर्णय देना था',
                unmet: 'मेरे पूर्व-प्राधिकरण अनुरोध का समय पर उत्तर नहीं मिला।',
                then: 'जाने से पहले आयुष्मान मित्र से पूर्व-प्राधिकरण संख्या लिखित में लें।',
              },
            },
            {
              anchor: 'complained',
              hours: 48,
              status: 'guideline',
              what: 'The grievance must be resolved',
              claim:
                'My complaint about the refusal was to be resolved within 48 hours of being received, by {due}',
              unmet: 'I have not received a reply to my complaint.',
              ...provision('section 7.2', GRGUIDE_DOC, GRGUIDE_WHERE),
              note: 'A complaint about a refusal of treatment, or about money demanded at the hospital, has to be resolved within 48 hours of the complaint being received.',
              then: 'Ask the District Nodal Officer to take the case up, and quote the Unique Ticket Number.',
              hi: {
                claim: 'इनकार की मेरी शिकायत मिलने के 48 घंटे के भीतर, {due} तक, उसका समाधान करना था',
                unmet: 'मेरी शिकायत का कोई उत्तर नहीं मिला।',
                then: 'जिला नोडल अधिकारी से मामला उठाने को कहें और यूनिक टिकट नंबर बताएँ।',
              },
            },
            {
              anchor: 'grieved',
              days: 15,
              status: 'guideline',
              what: 'The District or State Grievance Nodal Officer must resolve it',
              claim:
                'The District or State Grievance Nodal Officer had 15 days from the receipt of my grievance to resolve it, by {due}',
              unmet: 'I have not received a resolution of my grievance.',
              ...provision('Table 1', GRGUIDE_DOC, GRGUIDE_WHERE),
              note: 'A refusal registered at the time of discharge, or after it, has 15 days. A refusal at the time of admission has to be settled in 48 hours.',
              then: 'Ask for it to be moved to the Grievance Redressal Committee, and keep the Unique Ticket Number.',
              hi: {
                claim: 'जिला या राज्य शिकायत नोडल अधिकारी के पास मेरी शिकायत मिलने से 15 दिन के भीतर, {due} तक, उसका समाधान करना था',
                unmet: 'मेरी शिकायत का समाधान नहीं हुआ।',
                then: 'शिकायत समाधान समिति के पास भेजने को कहें और यूनिक टिकट नंबर रखें।',
              },
            },
            {
              anchor: 'grieved',
              days: 30,
              status: 'guideline',
              what: 'The Grievance Redressal Committee must decide the matter',
              claim:
                'The Grievance Redressal Committee had 30 days from the receipt of my grievance to decide it, by {due}',
              unmet: 'I have not received a decision on my grievance.',
              ...provision('sections 9.3.3 and 9.3.4', GRGUIDE_DOC, GRGUIDE_WHERE),
              note: 'Thirty days from the receipt of the grievance.',
              then: 'Keep the Unique Ticket Number. Every further step quotes it.',
              hi: {
                claim: 'शिकायत समाधान समिति के पास मेरी शिकायत मिलने से 30 दिन के भीतर, {due} तक, उस पर निर्णय लेना था',
                unmet: 'मेरी शिकायत पर निर्णय नहीं मिला।',
                then: 'यूनिक टिकट नंबर रखें। आगे की हर कार्रवाई में वही उद्धृत होता है।',
              },
            },
            {
              anchor: 'decided',
              days: 30,
              status: 'guideline',
              what: 'You must file your appeal, or you lose the right to appeal',
              claim:
                'I had 30 days from the decision to file my appeal, by {due}',
              unmet: 'The time to file my appeal has run out.',
              ...provision('sections 9.3.5 and 9.3.6', GRGUIDE_DOC, GRGUIDE_WHERE),
              note: 'The appeal goes to the committee with powers of appeal, within 30 days of the decision. Miss the 30 days and the decision becomes final and binding.',
              then: 'File the appeal on CGRMS within the 30 days and keep the acknowledgement.',
              hi: {
                claim: 'निर्णय से 30 दिन के भीतर, {due} तक, मुझे अपनी अपील दर्ज करनी थी',
                unmet: 'अपील दर्ज करने का समय बीत गया।',
                then: '30 दिन के भीतर CGRMS पर अपील दर्ज करें और पावती रखें।',
              },
            },
          ],
        },
      },
    ],
  },
  {
    id: 'pmayg',
    name: 'PMAY-G',
    full: 'Pradhan Mantri Awaas Yojana - Gramin',
    ministry: 'Ministry of Rural Development',
    portal: 'https://pmayg.dord.gov.in',
    what: 'A pucca house with basic amenities for every rural household that does not own one, and a 90-95 day work guarantee on it.',
    note: 'The portal publishes a panchayat-wise permanent wait list, instalment details, beneficiary search and FTO tracking. The office that approves a house varies by State.',
    situations: [
      {
        id: 'notselected',
        label: 'I am not on the list',
        complaint: 'I am not on the wait list for a house.',
        ask: 'I ask that my name be added to the wait list, that I be told my place on it, and that you reply to me in writing.',
        hi: {
          label: 'मेरा नाम सूची में नहीं है',
          complaint: 'मेरा नाम घर के लिए प्रतीक्षा सूची में नहीं है।',
          ask: 'मेरी प्रार्थना है कि मेरा नाम प्रतीक्षा सूची में जोड़ा जाए, मुझे उसमें अपना स्थान बताया जाए, और मुझे लिखित उत्तर दिया जाए।',
        },
        rungs: [
          {
            level: 'village',
            office: 'Gram Panchayat',
            post: 'Gram Panchayat Secretary, with the Gram Sabha',
            decides:
              'Verifies the household against the permanent wait list and records the household details.',
            carry: 'Aadhaar of every member, ration card, land or house documents',
            where: 'The Gram Panchayat office',
            status: 'varies',
            source: 'pmayg.dord.gov.in (panchayat-wise permanent wait list and SECC family member details)',
          },
          {
            level: 'block',
            office: 'Block rural development office',
            post: 'Block Development Officer or Block Mission Officer',
            decides:
              'Checks the household and takes the case forward. The post name is set by the State rural development department.',
            carry: 'The Gram Panchayat’s verification, the household documents',
            where: 'The block panchayat or DRDA office',
            status: 'varies',
            source: 'pmayg.dord.gov.in',
          },
          {
            level: 'district',
            office: 'District rural development office',
            post: 'District Programme Officer or District Mission Officer',
            decides:
              'Approves the household for the scheme and the instalment releases against it.',
            carry: 'The block’s report',
            where: 'The District Collector’s office',
            status: 'varies',
            source: 'pmayg.dord.gov.in',
          },
          {
            level: 'state',
            office: 'State Rural Housing Mission',
            post: 'State Mission Director, Rural Housing',
            decides:
              'Runs the State housing pipeline and releases the instalments. The State has a single window for the whole State.',
            carry: 'The district’s sanction order',
            where: 'The State rural development department',
            status: 'varies',
            source: 'pmayg.dord.gov.in',
          },
          {
            level: 'national',
            office: 'PMAY-G portal',
            post: 'Ministry of Rural Development',
            decides:
              'Holds the national household records, the wait list and the instalment tracker, and publishes what can be checked.',
            carry: 'The wait list number, or the Aadhaar',
            where: 'pmayg.dord.gov.in',
            status: 'portal',
            source: 'pmayg.dord.gov.in',
          },
        ],
        // The framework sets a period for a grievance and none for
        // selection: a household’s place on the wait list is not a deadline
        // the record can carry.
        clock: {
          anchors: [
            {
              id: 'complained',
              label: 'The day you complained to the office',
              sentence: 'I complained to the office on {date}.',
              hi: { sentence: 'मैंने {date} को कार्यालय में शिकायत की थी।' },
            },
          ],
          deadlines: [
            {
              anchor: 'complained',
              days: 15,
              status: 'guideline',
              what: 'Your grievance must be disposed of',
              claim:
                'Under the framework my grievance had to be disposed of within fifteen days of my complaint, by {due}',
              unmet: 'My grievance has not been disposed of.',
              hi: {
                claim:
                  'ढाँचे के अनुसार मेरी शिकायत को शिकायत की तारीख से पंद्रह दिन के भीतर, {due} तक निपटाया जाना चाहिए था',
                unmet: 'मेरी शिकायत अब तक निपटाई नहीं गई है।',
              },
              ...provision('section 12.2', PMAY_DOC, PMAY_WHERE),
              note: 'The framework tells the officer designated at each level to dispose of a grievance within fifteen days of receiving it. It sets no period for a household to be added to the wait list.',
              then: 'Send the complaint to the District Programme Officer, and keep the dated copy.',
            },
          ],
        },
      },
      {
        id: 'money',
        label: 'The instalment did not come',
        complaint: 'The instalment for my house has not come.',
        ask: 'I ask that the instalment be paid to me, and that you reply to me in writing.',
        hi: {
          label: 'घर की किस्त नहीं आई',
          complaint: 'मेरे घर की किस्त नहीं आई है।',
          ask: 'मेरी प्रार्थना है कि मुझे किस्त का भुगतान किया जाए, और मुझे लिखित उत्तर दिया जाए।',
        },
        rungs: [
          {
            level: 'village',
            office: 'Gram Panchayat',
            post: 'Gram Panchayat Secretary',
            decides:
              'Confirms the household’s bank account and that the house is recorded as built.',
            carry: 'The passbook, the house completion record',
            where: 'The Gram Panchayat office',
            status: 'varies',
            source: 'pmayg.dord.gov.in (beneficiary search and instalment details)',
          },
          {
            level: 'block',
            office: 'Block rural development office',
            post: 'Block Development Officer or Block Mission Officer',
            decides: 'Checks the house completion report for the village.',
            carry: 'The completion certificate, the passbook',
            where: 'The block panchayat or DRDA office',
            status: 'varies',
            source: 'pmayg.dord.gov.in',
          },
          {
            level: 'district',
            office: 'District rural development office',
            post: 'District Programme Officer or District Mission Officer',
            decides:
              'Verifies the completion and sanctions the instalment, then sends it to the central fund.',
            carry: 'The block’s completion report, the passbook',
            where: 'The District Collector’s office',
            status: 'varies',
            source: 'pmayg.dord.gov.in',
          },
          {
            level: 'state',
            office: 'State Rural Housing Mission',
            post: 'State Mission Director, Rural Housing',
            decides:
              'Releases the instalment and carries the FTO to the central fund.',
            carry: 'The district’s sanction order',
            where: 'The State rural development department',
            status: 'varies',
            source: 'pmayg.dord.gov.in (FTO tracking)',
          },
          {
            level: 'national',
            office: 'PMAY-G portal',
            post: 'Ministry of Rural Development',
            decides:
              'Holds the national record and the instalment tracker, and publishes what can be checked.',
            carry: 'The beneficiary number',
            where: 'pmayg.dord.gov.in',
            status: 'portal',
            source: 'pmayg.dord.gov.in',
          },
        ],
        // Two periods are published. The first instalment has a seven-day
        // release target counted from sanction; a grievance has fifteen
        // days. The framework sets no payment period for the second and
        // third instalments, and the note says so instead of giving a date
        // the record cannot support.
        clock: {
          anchors: [
            {
              id: 'sanctioned',
              label: 'The day the sanction order was issued',
              sentence: 'My house was sanctioned on {date}.',
              hi: { sentence: 'मेरे घर का स्वीकृति आदेश {date} को जारी हुआ था।' },
            },
            {
              id: 'complained',
              label: 'The day you complained to the office',
              sentence: 'I complained to the office on {date}.',
              hi: { sentence: 'मैंने {date} को कार्यालय में शिकायत की थी।' },
            },
          ],
          deadlines: [
            {
              anchor: 'sanctioned',
              days: 7,
              status: 'guideline',
              what: 'The first instalment must be released',
              claim:
                'The first instalment had to be released within seven days of my sanction order, by {due}',
              unmet: 'I have not been paid the first instalment.',
              hi: {
                claim:
                  'स्वीकृति आदेश के सात दिन के भीतर, {due} तक, मेरी पहली किस्त जारी की जानी चाहिए थी',
                unmet: 'मुझे पहली किस्त का भुगतान नहीं हुआ है।',
              },
              ...provision('the instalment release timeline', PMAY_DOC, PMAY_WHERE),
              note: 'The framework’s release timeline says the first instalment is to be released within seven days after sanction. It sets no payment period for the second and third instalments, which are tied to construction stages, so this date covers the first instalment only.',
              then: 'Ask the District Programme Officer for the fund transfer order number and the date it was sent.',
            },
            {
              anchor: 'complained',
              days: 15,
              status: 'guideline',
              what: 'Your grievance about the instalment must be disposed of',
              claim:
                'Under the framework my grievance about the instalment had to be disposed of within fifteen days of my complaint, by {due}',
              unmet: 'My grievance about the instalment has not been disposed of.',
              hi: {
                claim:
                  'ढाँचे के अनुसार किस्त के बारे में मेरी शिकायत को शिकायत की तारीख से पंद्रह दिन के भीतर, {due} तक निपटाया जाना चाहिए था',
                unmet: 'किस्त के बारे में मेरी शिकायत अब तक निपटाई नहीं गई है।',
              },
              ...provision('section 12.2', PMAY_DOC, PMAY_WHERE),
              note: 'The same fifteen-day period covers a grievance at any stage, including a later instalment that has no payment period of its own.',
              then: 'Send the complaint to the District Programme Officer, and keep the dated copy.',
            },
          ],
        },
      },
    ],
  },
  {
    id: 'pmuy',
    name: 'Ujjwala Yojana',
    full: 'Pradhan Mantri Ujjwala Yojana',
    ministry: 'Ministry of Petroleum and Natural Gas',
    portal: 'https://www.pmuy.gov.in',
    what: 'A deposit-free LPG connection in the name of a woman from a poor household, with the first refill free.',
    note: 'The first step is a distributor, not a government office. The oil marketing company handles the grievance; the Ministry sets the policy.',
    situations: [
      {
        id: 'connection',
        label: 'My connection is not coming',
        complaint: 'My gas connection has not come.',
        ask: 'I ask that my connection be made, and that you reply to me in writing.',
        clockGap:
          'The PMUY guidelines (2016) and the PMUY portal set no period from application to connection. The oil companies’ citizen charters say seven working days for a new connection, but count it from their own conditions being met, not from your application, so it is not recorded as a deadline here.',
        rungs: [
          {
            level: 'village',
            office: 'LPG distributor',
            post: 'LPG distributor of an oil marketing company',
            decides:
              'Takes the application, does the mandatory biometric Aadhaar check, and releases the connection.',
            carry: 'Aadhaar, the ration card, the address proof',
            where: 'The LPG distributor in your area, or a CSC that helps with the form',
            status: 'official',
            source: 'pmuy.gov.in/faq.html',
          },
          {
            level: 'block',
            office: 'Block office',
            post: 'Block welfare or rural development staff, where the State runs a camp',
            decides:
              'Helps households that cannot reach a distributor. The scheme FAQ names the distributor and the CSC, not a block post.',
            carry: 'The application receipt',
            where: 'The block office',
            status: 'varies',
            source: 'pmuy.gov.in/faq.html',
          },
          {
            level: 'district',
            office: 'Oil marketing company district or regional office',
            post: 'District or Regional Manager of the OMC',
            decides:
              'Holds the district application list and the subsidy record. The FAQ does not name this post, so the OMC’s own contact page is the place to confirm it.',
            carry: 'The application number, the distributor’s name',
            where: 'The OMC’s district or regional office',
            status: 'varies',
            source: 'pmuy.gov.in/about.html and /faq.html',
          },
          {
            level: 'state',
            office: 'Oil marketing company state office',
            post: 'State General Manager of the OMC',
            decides: 'Holds the State policy and the subsidy release.',
            carry: 'The case history',
            where: 'The OMC state office',
            status: 'varies',
            source: 'pmuy.gov.in/about.html',
          },
          {
            level: 'national',
            office: 'PMUY portal',
            post: 'Ministry of Petroleum and Natural Gas',
            decides:
              'Sets the scheme, and the FAQ points grievances to the OMC channels and a toll-free number rather than to the Ministry.',
            carry: 'The application number',
            where: 'pmuy.gov.in, or the toll-free 1800 266 6696',
            status: 'portal',
            source: 'pmuy.gov.in/faq.html',
          },
        ],
      },
    ],
  },
  {
    id: 'svanidhi',
    name: 'PM SVANidhi',
    full: 'Pradhan Mantri Street Vendor’s AtmaNirbhar Nidhi',
    ministry: 'Ministry of Housing and Urban Affairs, DAY-NULM',
    portal: 'https://pmsvanidhi.mohua.gov.in',
    what: 'A collateral-free working capital loan of up to Rs 50,000 to a street vendor, in three tranches.',
    note: 'The portal publishes the contact list: the urban local body point of contact, the State nodal officer and the bank nodal officer.',
    situations: [
      {
        id: 'loan',
        label: 'My loan was rejected or not paid',
        complaint: 'My loan was rejected, or the money has not come.',
        ask: 'I ask that my loan be sanctioned and paid, or that you tell me in writing why it was refused.',
        hi: {
          label: 'मेरा ऋण अस्वीकार हुआ या नहीं मिला',
          complaint: 'मेरा ऋण अस्वीकार कर दिया गया, या पैसा नहीं आया।',
          ask: 'मेरी प्रार्थना है कि मेरा ऋण स्वीकृत और भुगतान किया जाए, या मुझे लिखित रूप में बताया जाए कि वह क्यों अस्वीकार हुआ।',
        },
        rungs: [
          {
            level: 'village',
            office: 'Urban local body',
            post: 'ULB administrator or point of contact for the scheme',
            decides:
              'Runs the street vendor survey that decides who is on the list, and issues the Letter of Recommendation.',
            carry: 'The survey slip, the Letter of Recommendation',
            where: 'The municipal office or the ward office',
            status: 'official',
            source: 'pmsvanidhi.mohua.gov.in and /Home/Contact',
          },
          {
            level: 'block',
            office: 'Block office',
            post: 'Block urban development or DAY-NULM staff, where the State runs one',
            decides:
              'Coordinates the vendors in the block between the urban local body and the bank. The portal does not name a block post.',
            carry: 'The Letter of Recommendation',
            where: 'The block office',
            status: 'varies',
            source: 'pmsvanidhi.mohua.gov.in/Home/Contact',
          },
          {
            level: 'district',
            office: 'District urban mission',
            post: 'District Mission Coordinator of DAY-NULM',
            decides:
              'Keeps the district vendor list and supports the lending. The portal names the State nodal officer, and the district post is State-specific.',
            carry: 'The application status, the bank’s reply',
            where: 'The district urban mission office',
            status: 'varies',
            source: 'pmsvanidhi.mohua.gov.in/Home/Contact',
          },
          {
            level: 'state',
            office: 'State nodal office',
            post: 'State Nodal Officer for PM SVANidhi',
            decides:
              'Runs the State side of the scheme and the interface with the banks. The portal publishes a State nodal contact for each State.',
            carry: 'The application number, the LoR',
            where: 'The State nodal officer listed on the portal',
            status: 'official',
            source: 'pmsvanidhi.mohua.gov.in/Home/Contact',
          },
          {
            level: 'national',
            office: 'PM SVANidhi portal',
            post: 'Ministry of Housing and Urban Affairs, DAY-NULM',
            decides:
              'Holds the application status and publishes the Bank Nodal Officer contact for each bank.',
            carry: 'The application number',
            where: 'pmsvanidhi.mohua.gov.in',
            status: 'portal',
            source: 'pmsvanidhi.mohua.gov.in and /Home/Contact',
          },
        ],
        // The guidelines set one period a vendor can hold the urban local
        // body to, and none for the bank. The note keeps the two apart.
        clock: {
          anchors: [
            {
              id: 'applied',
              label: 'The day you applied',
              sentence: 'I applied on {date}.',
              hi: { sentence: 'मैंने {date} को आवेदन किया था।' },
            },
          ],
          deadlines: [
            {
              anchor: 'applied',
              days: 15,
              status: 'guideline',
              what: 'The urban local body must verify your application and issue the Letter of Recommendation',
              claim:
                'The urban local body had to verify my application and issue my Letter of Recommendation within fifteen days of my application, by {due}',
              unmet: 'I have not been given the Letter of Recommendation.',
              hi: {
                claim:
                  'शहरी स्थानीय निकाय को मेरे आवेदन की जाँच करके पंद्रह दिन के भीतर, {due} तक, मेरा अनुशंसा पत्र जारी करना था',
                unmet: 'मुझे अनुशंसा पत्र अब तक नहीं दिया गया है।',
              },
              ...provision(
                'the verification and Letter of Recommendation paragraph',
                SVAN_DOC,
                SVAN_WHERE
              ),
              note: 'The guidelines say verification and issue of the Letter of Recommendation shall be completed within fifteen days of the submission of the application. They set no period for the bank to sanction or disburse the loan.',
              then: 'Ask the urban local body for the reason in writing, then take it to the State nodal officer listed on the portal.',
            },
          ],
        },
      },
    ],
  },
  {
    id: 'vishwakarma',
    name: 'PM Vishwakarma',
    full: 'Pradhan Mantri Vishwakarma',
    ministry: 'Ministry of Micro, Small and Medium Enterprises',
    portal: 'https://pmvishwakarma.gov.in',
    what: 'Collateral-free credit, skill training and toolkits for traditional artisans and craftspersons in 18 trades.',
    note: 'The official FAQ says to visit a Common Service Centre, an MSME-DFO or a District Industries Centre for anything to do with the scheme. That is the published route.',
    situations: [
      {
        id: 'loan',
        label: 'My loan or training was refused',
        complaint: 'My loan or my training was refused.',
        ask: 'I ask that my loan or my training be approved, or that you tell me in writing why it was refused.',
        clockGap:
          'The PM Vishwakarma guidelines set no period for verifying an application, sanctioning or paying a loan, or disposing of a grievance. The five to seven days in the FAQ is the length of basic training after skill verification, not a processing deadline.',
        rungs: [
          {
            level: 'village',
            office: 'Common Service Centre',
            post: 'CSC operator',
            decides:
              'Registers the artisan and helps with the portal. The FAQ names the CSC as a place to go for scheme queries.',
            carry: 'Aadhaar, the caste or category certificate, the trade proof',
            where: 'The nearest CSC',
            status: 'official',
            source: 'pmvishwakarma.gov.in/Home/FAQ',
          },
          {
            level: 'block',
            office: 'District Industries Centre',
            post: 'District Industries Centre officer',
            decides:
              'A place to go for scheme queries, and in most States the place where the artisan is verified and the training is arranged.',
            carry: 'The registration receipt',
            where: 'The District Industries Centre',
            status: 'official',
            source: 'pmvishwakarma.gov.in/Home/FAQ',
          },
          {
            level: 'district',
            office: 'MSME Development and Facilitation Office',
            post: 'MSME-DFO officer',
            decides:
              'Named by the FAQ as a place to go for scheme queries, and the office that hands the artisan to the bank and the training partner.',
            carry: 'The verification record, the bank’s rejection letter',
            where: 'The MSME-DFO office',
            status: 'official',
            source: 'pmvishwakarma.gov.in/Home/FAQ',
          },
          {
            level: 'state',
            office: 'State MSME department',
            post: 'State industries department',
            decides: 'Runs the State programme and the State screening committee.',
            carry: 'The district’s file',
            where: 'The State industries department',
            status: 'varies',
            source: 'pmvishwakarma.gov.in',
          },
          {
            level: 'national',
            office: 'PM Vishwakarma portal',
            post: 'Ministry of Micro, Small and Medium Enterprises',
            decides: 'Holds the national registration, the categories and the lender list.',
            carry: 'The registration number',
            where: 'pmvishwakarma.gov.in',
            status: 'portal',
            source: 'pmvishwakarma.gov.in/Home/FAQ',
          },
        ],
      },
    ],
  },
  {
    id: 'ssy',
    name: 'Sukanya Samriddhi',
    full: 'Sukanya Samriddhi Yojana',
    ministry: 'Department of Posts, Ministry of Finance; and Department of Financial Services',
    portal: 'https://www.indiapost.gov.in',
    what: 'A savings account for a girl child, with a high interest rate and full tax exemption on the deposits and the interest.',
    note: 'The account is opened at a bank branch or a post office. A complaint about a post office transaction follows the postal complaint route, which is published.',
    situations: [
      {
        id: 'open',
        label: 'Opening or closing the account',
        complaint: 'I want to open or close my account, and I have not been able to do it.',
        ask: 'I ask that my account be opened or closed, and that you reply to me in writing.',
        clockGap:
          'The Sukanya Samriddhi Account Scheme, 2019 sets no period for opening or closing an account. India Post’s citizen charter carries a same-day counter-service standard, but it is a general postal standard rather than a period the scheme rules give you.',
        rungs: [
          {
            level: 'village',
            office: 'Bank branch or post office',
            post: 'Branch counter, or Postmaster / In-charge of the Post Office',
            decides:
              'Opens and operates the account. The SBI FAQ says a guardian may open the account at any SBI branch.',
            carry: 'The girl’s birth certificate, the guardian’s Aadhaar and PAN, photographs',
            where: 'The bank branch or the post office',
            status: 'official',
            source: 'sbi.bank.in/web/faq-s/faq-sukanya-samriddhi-account',
          },
          {
            level: 'block',
            office: 'Block office',
            post: 'Block welfare or financial inclusion staff, where the State runs an enrolment camp',
            decides:
              'Helps families apply at a camp. The scheme rules name the post office and the bank, not a block post.',
            carry: 'The documents above',
            where: 'The block office',
            status: 'varies',
            source: 'posts.india.gov.in and the SSY scheme rules',
          },
          {
            level: 'district',
            office: 'District office of the bank or the postal division',
            post: 'District Manager of the bank, or the Superintendent of Post Offices',
            decides:
              'Handles a disputed account or a payment not credited, and the post office complaint route starts here.',
            carry: 'The passbook, the account number, the transaction slip',
            where: 'The district bank office or the divisional post office',
            status: 'official',
            source: 'indiapost.gov.in/help&Support/contactus',
          },
          {
            level: 'state',
            office: 'State postal circle or the bank’s State office',
            post: 'Circle Postmaster, or the State head of the bank',
            decides: 'Holds the State administration of the scheme and the complaint escalation.',
            carry: 'The district’s reply',
            where: 'The Circle Post Office or the bank’s State office',
            status: 'varies',
            source: 'indiapost.gov.in/help&Support/contactus',
          },
          {
            level: 'national',
            office: 'Postal Directorate and the Department of Financial Services',
            post: 'Department of Posts, Ministry of Finance',
            decides:
              'Administers the scheme and takes a complaint if the circle has not resolved it. The postal complaint route ends at the Directorate.',
            carry: 'Everything below, with the dates',
            where: 'indiapost.gov.in, and the SSY rules on the Finance Ministry site',
            status: 'official',
            source: 'indiapost.gov.in/help&Support/contactus',
          },
        ],
      },
    ],
  },
  {
    id: 'eshram',
    name: 'e-Shram',
    full: 'e-Shram, the national database for unorganised workers',
    ministry: 'Ministry of Labour and Employment',
    portal: 'https://eshram.gov.in',
    what: 'A national registration and database of unorganised workers, with a Universal Account Number that other schemes can build on.',
    note: 'The official FAQ sends people to a Common Service Centre for enrolment. The grievance route is a named officer at the Ministry.',
    situations: [
      {
        id: 'register',
        label: 'Registering, or fixing my record',
        complaint: 'I want to register, or to correct my record, and it has not been done.',
        ask: 'I ask that my record be registered or corrected, and that you reply to me in writing.',
        clockGap:
          'The e-Shram FAQ says a Universal Account Number is assigned after registration, without a period. Its grievance page tracks a complaint as open, in progress or closed, and sets no disposal period.',
        rungs: [
          {
            level: 'village',
            office: 'Common Service Centre',
            post: 'CSC operator',
            decides:
              'Enrols the worker and updates the profile. The FAQ points users here for enrolment and updates.',
            carry: 'Aadhaar, the mobile number linked to Aadhaar, bank details',
            where: 'The nearest CSC',
            status: 'official',
            source: 'eshram.gov.in/faqs and eshram.gov.in/help',
          },
          {
            level: 'block',
            office: 'Block employment or skill office',
            post: 'Block Employment Exchange or skill development staff, where the State runs one',
            decides:
              'Helps with registration and with the schemes that use the record. The e-Shram FAQ does not make this a required step.',
            carry: 'The UAN, the Aadhaar',
            where: 'The block employment office',
            status: 'varies',
            source: 'eshram.gov.in/faqs',
          },
          {
            level: 'district',
            office: 'District employment office',
            post: 'District Employment Exchange or District Skill Development Agency',
            decides:
              'Handles the State record of workers. The e-Shram FAQ names no district escalation route, so this is the local office to ask.',
            carry: 'The UAN, the employment exchange number',
            where: 'The District Employment Exchange',
            status: 'varies',
            source: 'eshram.gov.in/faqs and /grievance',
          },
          {
            level: 'state',
            office: 'State labour and employment department',
            post: 'State labour department',
            decides: 'Runs the State side of the database and the State link to the scheme.',
            carry: 'The district’s file',
            where: 'The State labour department',
            status: 'varies',
            source: 'eshram.gov.in/faqs',
          },
          {
            level: 'national',
            office: 'e-Shram grievance officer',
            post: 'Grievance Redressal Officer, Under Secretary, Ministry of Labour and Employment',
            decides:
              'Takes the grievance, keeps a register and reports the status back. The portal has a register and status feature.',
            carry: 'The UAN, the CSC receipt, the helpdesk reference',
            where: 'eshram.gov.in/grievance, or the helpdesk on 14434',
            status: 'official',
            source: 'eshram.gov.in/grievance; eshram.gov.in/help',
          },
        ],
      },
    ],
  },
  {
    id: 'nsp',
    name: 'National Scholarship Portal',
    full: 'National Scholarship Portal, Department of Higher Education',
    ministry: 'Department of Higher Education, Ministry of Education',
    portal: 'https://scholarships.gov.in',
    what: 'One application point for the central and state scholarship schemes, with a single scholarship account for the student.',
    note: 'The portal publishes a nodal officer lookup by ministry, state, district and scheme, and a list of grievance redressal officers for the central sector schemes.',
    situations: [
      {
        id: 'notpaid',
        label: 'My scholarship was not paid',
        complaint: 'My scholarship has not been paid.',
        ask: 'I ask that my scholarship be paid, and that you reply to me in writing.',
        clockGap:
          'The CSSS guidelines (updated 7 February 2024) set no period between institute verification and disbursement. The portal publishes closing dates for each academic year, which are cut-off dates, not a deadline for paying a student.',
        rungs: [
          {
            level: 'village',
            office: 'Your institution',
            post: 'The institution’s scholarship cell or the scheme-wise Nodal Officer',
            decides:
              'Verifies the application, and is the first place to ask when the application was rejected or stuck.',
            carry: 'The application number, the institution’s verification status',
            where: 'The college or university scholarship cell',
            status: 'official',
            source: 'scholarships.gov.in/Officers',
          },
          {
            level: 'block',
            office: 'Block education office',
            post: 'Block education or social welfare staff, where the State runs the verification camps',
            decides:
              'Runs the camps that verify students for the State schemes. The portal does not name a block post.',
            carry: 'The application number, the documents',
            where: 'The block education office',
            status: 'varies',
            source: 'scholarships.gov.in/Officers',
          },
          {
            level: 'district',
            office: 'District scholarship office',
            post: 'Scheme-wise District Nodal Officer',
            decides:
              'Handles a rejected or unpaid application for the schemes it owns. The portal publishes a nodal officer lookup by district and scheme.',
            carry: 'The application number, the rejection message',
            where: 'The district education or social welfare office',
            status: 'official',
            source: 'scholarships.gov.in/nodelOfficerDetails',
          },
          {
            level: 'state',
            office: 'State scholarship office',
            post: 'Scheme-wise State Nodal Officer',
            decides:
              'Owns the State schemes and the State share of the payment.',
            carry: 'The application number, the district’s reply',
            where: 'The nodal officer listed on the portal for your State and scheme',
            status: 'official',
            source: 'scholarships.gov.in/Officers and /nodelOfficerDetails',
          },
          {
            level: 'national',
            office: 'NSP grievance',
            post: 'Scheme-wise Grievance Redressal Officer for the central sector schemes',
            decides:
              'Takes the grievance for the central sector schemes. The portal publishes the list of these officers.',
            carry: 'The application number, the bank account the student is using',
            where: 'scholarships.gov.in',
            status: 'official',
            source: 'scholarships.gov.in/Officers',
          },
        ],
      },
    ],
  },
  {
    id: 'saubhagya',
    name: 'Saubhagya',
    full: 'Saubhagya, household electricity connections',
    ministry: 'Ministry of Power; Rural Electrification Corporation is the nodal agency',
    portal: 'https://powermin.gov.in',
    what: 'A free domestic electricity connection to every household that did not have one, including the poor households that the earlier Rajiv Gandhi Grihainyanti Yojana had left out.',
    note: 'The application is taken by the electricity distribution company, not by a panchayat. Villages without a connection are served at camps run by the company.',
    situations: [
      {
        id: 'connection',
        label: 'My connection was refused or cancelled',
        complaint: 'My electricity connection was refused or cancelled.',
        ask: 'I ask that my connection be restored, or that you tell me in writing why it was cancelled.',
        hi: {
          label: 'मेरा कनेक्शन अस्वीकार हुआ या काट दिया गया',
          complaint: 'मेरा बिजली कनेक्शन अस्वीकार कर दिया गया, या काट दिया गया।',
          ask: 'मेरी प्रार्थना है कि मेरा कनेक्शन बहाल किया जाए, या मुझे लिखित रूप में बताया जाए कि वह क्यों काटा गया।',
        },
        rungs: [
          {
            level: 'village',
            office: 'Electricity distribution company camp',
            post: 'DISCOM field staff',
            decides:
              'Takes the application and facilitates release of the connection. The company runs village and village-cluster camps for this.',
            carry: 'Aadhaar, the ration card, proof of the household’s standing as eligible',
            where: 'The local electricity office, or the camp in your village',
            status: 'official',
            source: 'lpdd.ladakh.gov.in/Saubhagya.php',
          },
          {
            level: 'block',
            office: 'Block office',
            post: 'Block development or rural electrification staff, where the State runs a camp',
            decides:
              'Helps the camp reach villages that the company has not covered. The published scheme page names the company, not the block.',
            carry: 'The application receipt',
            where: 'The block office',
            status: 'varies',
            source: 'lpdd.ladakh.gov.in/Saubhagya.php',
          },
          {
            level: 'district',
            office: 'Electricity distribution company division',
            post: 'Divisional Engineer',
            decides:
              'Holds the division’s connection records and the section that handles a refused or cancelled application.',
            carry: 'The application number, the refusal letter',
            where: 'The division office',
            status: 'varies',
            source: 'lpdd.ladakh.gov.in/Saubhagya.php',
          },
          {
            level: 'state',
            office: 'State electricity distribution company or power department',
            post: 'General Manager of the distribution company',
            decides:
              'Runs the State scheme. A household that is a defaulter is not to get the benefit, though the company may settle the old dues and reconnect under its own rules.',
            carry: 'The division’s reply, the dues record',
            where: 'The State power department or the company’s State office',
            status: 'official',
            source: 'lpdd.ladakh.gov.in/Saubhagya.php',
          },
          {
            level: 'national',
            office: 'Rural Electrification Corporation',
            post: 'REC, for the Ministry of Power',
            decides:
              'Is the nodal agency for the scheme, and monitors the State programme. The published page does not give a route for an individual complaint.',
            carry: 'The State’s reply',
            where: 'powermin.gov.in',
            status: 'official',
            source: 'lpdd.ladakh.gov.in/Saubhagya.php',
          },
        ],
        // A connection is a service under the Electricity (Rights of
        // Consumers) Rules, so the clock is the rule rather than the scheme
        // page. The rule sets four limits; the rural one is used, and the
        // note gives the others so the citizen can see which applies.
        clock: {
          anchors: [
            {
              id: 'applied',
              label: 'The day you applied for the connection',
              sentence: 'I applied for a connection on {date}.',
              hi: { sentence: 'मैंने {date} को कनेक्शन के लिए आवेदन किया था।' },
            },
          ],
          deadlines: [
            {
              anchor: 'applied',
              days: 15,
              status: 'statutory',
              what: 'Your connection must be released in a rural area',
              claim:
                'Under the Electricity (Rights of Consumers) Rules my connection had to be released within fifteen days of my complete application, by {due}',
              unmet: 'My connection has not been released.',
              hi: {
                claim:
                  'बिजली (उपभोक्ता अधिकार) नियमों के अनुसार मेरा कनेक्शन पूरे आवेदन के पंद्रह दिन के भीतर, {due} तक, जारी किया जाना चाहिए था',
                unmet: 'मेरा कनेक्शन अब तक जारी नहीं हुआ है।',
              },
              ...provision('Rule 4(11)', ELEC_DOC, ELEC_WHERE),
              note: 'Rule 4(11) fixes three days in a metropolitan area, seven in another municipal area and fifteen in a rural area, counted from an application complete in all respects. In a rural area of a State or Union Territory with hilly terrain the limit is thirty days, so check which of these your State falls under before you quote the date.',
              then: 'Complain to the distribution company’s grievance cell, then to the Electricity Ombudsman for your State.',
            },
          ],
        },
      },
    ],
  },
  {
    id: 'poshan',
    name: 'PM POSHAN',
    full: 'Pradhan Mantri Poshan Shakti Nirman, the Mid-Day Meal scheme',
    ministry: 'Department of School Education and Literacy, Ministry of Education',
    portal: 'https://pmposhan.education.gov.in',
    what: 'One hot cooked meal every school day for every child in a government and government-aided school, in Classes 1 to 8 and in pre-primary Balvatika.',
    note: 'The scheme runs on State rules and institutions, so the post names differ. The steps below are the pattern most States follow, and the state office is where the scheme actually runs.',
    situations: [
      {
        id: 'notfed',
        label: 'The kitchen is not running, or the meal is poor',
        complaint: 'The kitchen at my child’s school is not running, or the meal served there is poor.',
        ask: 'I ask that the kitchen be made to run every day, that the meal be checked, and that you reply to me in writing.',
        clockGap:
          'The PM POSHAN guidelines (2023), chapter 11, set no period for resolving a complaint. The Ministry’s RTI note says complaints are acted on in 10 to 15 days, but does not fix the event the period runs from, so it is not recorded as a deadline here.',
        rungs: [
          {
            level: 'village',
            office: 'The school',
            post: 'Head teacher, with the School Management Committee and the Gram Panchayat',
            decides:
              'Runs the kitchen, the attendance and the record of meals served. The SMC and the Panchayat supervise the school and the kitchen.',
            carry: 'The date, the meal, and photographs if it is safe to take them',
            where: 'The school',
            status: 'varies',
            source: 'pmposhan.education.gov.in scheme guidelines',
          },
          {
            level: 'block',
            office: 'Block education office',
            post: 'Block Resource Centre or the block education officer',
            decides:
              'Checks the kitchen, the menu and the enrolment, and supervises the block’s schools.',
            carry: 'The complaint in writing, with the date',
            where: 'The block resource centre or the block education office',
            status: 'varies',
            source: 'pmposhan.education.gov.in scheme guidelines',
          },
          {
            level: 'district',
            office: 'District education office',
            post: 'District Programme Officer, Sarva Shiksha Abhiyan',
            decides:
              'Supervises the scheme in the district, inspects kitchens and handles the grievance in the first instance.',
            carry: 'The block’s report',
            where: 'The District Education Office',
            status: 'varies',
            source: 'pmposhan.education.gov.in scheme guidelines',
          },
          {
            level: 'state',
            office: 'State education department',
            post: 'State Sarva Shiksha Abhiyan or MDM directorate',
            decides:
              'Runs the scheme, sets the menu and the norms, and holds the State grievance machinery. The scheme is administered by the States, so this is the level that decides.',
            carry: 'The district’s report',
            where: 'The State education department',
            status: 'varies',
            source: 'pmposhan.education.gov.in scheme guidelines',
          },
          {
            level: 'national',
            office: 'PM POSHAN',
            post: 'Department of School Education and Literacy, Ministry of Education',
            decides:
              'Sets the national norms, the funding pattern and the reporting, and publishes the scheme’s own channels.',
            carry: 'The State’s reply',
            where: 'pmposhan.education.gov.in',
            status: 'official',
            source: 'pmposhan.education.gov.in',
          },
        ],
      },
    ],
  },
];

// The scheme a citizen starts from is not always a central scheme, and the
// same name can mean two different things. This is the map of the traps.
export const NAME_TRAPS = [
  {
    confusion: 'PM-JANMAN',
    truth:
      'PM-JANMAN is a mission for Particularly Vulnerable Tribal Groups under the Ministry of Tribal Affairs, not the urban housing scheme. The urban scheme that replaced PMAY-U 2.0 is PMAY-U 2.0.',
  },
  {
    confusion: 'Samarthya',
    truth:
      'Under Mission Shakti, Sambal is the component for women’s safety and security, and Samarthya is the component for women’s empowerment. Samarthya is not the transgender persons’ scheme.',
  },
  {
    confusion: 'A Block and a Tehsil',
    truth:
      'They are different units. A block is a group of Gram Panchayats; a tehsil is a revenue division. A district often has both, and they do not line up.',
  },
  {
    confusion: 'The MGNREGA Ombudsman',
    truth:
      'The Act as published on nregaplus.nic.in sets out a block and a district grievance mechanism, and the MIS carries an Ombudsperson login. The statutory basis for the ombudsman tier is a later amendment, not the text this tool quotes.',
  },
];
