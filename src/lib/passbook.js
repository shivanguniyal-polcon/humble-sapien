// Khata's reading layer: the numbers, the questions, and the two documents a
// resident can carry out of the page.
//
// None of this touches React. Keeping it here means the English and Hindi
// questions are generated from the same captured figures, and the RTI and
// WhatsApp texts can be tested without a browser. Nothing in this file reads
// the network or stores anything.

const SCHEMES = {
  3287: { en: '15th Finance Commission', hi: '15वां वित्त आयोग' },
  2813: { en: '14th Finance Commission', hi: '14वां वित्त आयोग' },
  3109: { en: '4th State Finance Commission', hi: 'चौथा राज्य वित्त आयोग' },
  0: { en: 'Own resources', hi: 'अपने स्रोत' },
};

const MONTHS_EN = {
  Apr: 'April', May: 'May', Jun: 'June', Jul: 'July',
  Aug: 'August', Sep: 'September', Oct: 'October', Nov: 'November',
  Dec: 'December', Jan: 'January', Feb: 'February', Mar: 'March',
};

const MONTHS_HI = {
  Apr: 'अप्रैल', May: 'मई', Jun: 'जून', Jul: 'जुलाई',
  Aug: 'अगस्त', Sep: 'सितंबर', Oct: 'अक्टूबर', Nov: 'नवंबर',
  Dec: 'दिसंबर', Jan: 'जनवरी', Feb: 'फरवरी', Mar: 'मार्च',
};

const PLACES_HI = {
  Uttarakhand: 'उत्तराखंड',
  Dehradun: 'देहरादून',
  Doiwala: 'डोईवाला',
};

const textFor = (lang) => (lang === 'hi' ? 'hi' : 'en');

export const rupees = (value, lang = 'en') => {
  if (value == null || !Number.isFinite(Number(value))) {
    return lang === 'hi' ? 'प्रकाशित नहीं' : 'Not published';
  }
  return `₹${Math.round(Number(value)).toLocaleString('en-IN')}`;
};

export const dateLabel = (iso, lang = 'en') => {
  if (!iso) return lang === 'hi' ? 'प्रकाशित नहीं' : 'Not published';
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC',
  });
};

export const shareOf = (part, whole) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

// A chart axis needs a short rupee label, not a full passbook figure.
export const compactRupees = (value, lang = 'en') => {
  const n = Math.max(0, Number(value) || 0);
  const unit = (scaled, suffix) => `₹${scaled.toFixed(1).replace(/\.0$/, '')} ${suffix}`;
  const suffixes = lang === 'hi'
    ? { crore: 'करोड़', lakh: 'लाख', thousand: 'हज़ार' }
    : { crore: 'Cr', lakh: 'L', thousand: 'k' };
  if (n >= 1e7) return unit(n / 1e7, suffixes.crore);
  if (n >= 1e5) return unit(n / 1e5, suffixes.lakh);
  if (n >= 1e3) return unit(n / 1e3, suffixes.thousand);
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 1 })}`;
};

export const titleCase = (text) => String(text || '')
  .toLowerCase()
  .replace(/\b[a-z]/g, (letter) => letter.toUpperCase());

export const schemeName = (scheme, lang = 'en') => {
  const labels = SCHEMES[scheme?.code];
  if (!labels) return scheme?.name || '';
  return labels[textFor(lang)] || labels.en;
};

export const monthName = (label, lang = 'en') =>
  (lang === 'hi' ? MONTHS_HI[label] || label : label);

// The chart keeps the short label; prose uses the full month name so a
// sentence does not read "Nov 2025-2026".
export const monthLong = (label, lang = 'en') =>
  (lang === 'hi' ? MONTHS_HI[label] || label : MONTHS_EN[label] || label);

export const placeName = (value, lang = 'en') =>
  (lang === 'hi' ? PLACES_HI[value] || value : value);

const topMonth = (months, key) => {
  if (!months?.length) return null;
  return months.reduce(
    (best, month) => (month[key] > best[key] ? month : best),
    months[0],
  );
};

// The questions a resident can read out. They are generated from the captured
// record, not written in advance, so every figure in them is traceable to the
// source list on the page. The Hindi version uses the same figures and the
// same order; only the language changes.
export const buildQuestions = (doc, { lang = 'en' } = {}) => {
  const hi = lang === 'hi';
  const gp = doc.gp;
  const finance = gp.finance;
  const { totals, xvfc, months } = finance;
  const planApi = gp.worksSource === 'plan-api';
  const works = gp.works || [];
  const largest = finance.schemes?.length
    ? finance.schemes.reduce(
      (best, scheme) => (scheme.payments > best.payments ? scheme : best),
      finance.schemes[0],
    )
    : null;
  const paymentMonth = topMonth(months, 'payments');
  const completedNoun = planApi
    ? (hi ? 'पूर्ण योजना गतिविधियाँ' : 'completed plan activities')
    : (hi ? 'पूर्ण कार्य' : 'completed works');
  const completedOne = planApi ? (hi ? 'गतिविधि' : 'activity') : (hi ? 'कार्य' : 'work');

  const questions = [
    hi
      ? `ग्राम पंचायत को ${doc.year} में ${totals.schemeCount} योजनाओं से ${rupees(totals.receipts, lang)} मिले और ${rupees(totals.payments, lang)} का भुगतान हुआ। ये भुगतान किन कामों और बिलों के हैं?`
      : `The GP received ${rupees(totals.receipts, lang)} across ${totals.schemeCount} schemes and paid out ${rupees(totals.payments, lang)} in ${doc.year}. Which ${planApi ? 'activities' : 'works'} and bills do those payments cover?`,
    hi
      ? `31 मार्च ${String(doc.year).slice(-4)} तक 15वें वित्त आयोग का ${rupees(xvfc.closing, lang)} खाते में बचा था। यह किस काम के लिए रखा है और कब खर्च होगा?`
      : `${rupees(xvfc.closing, lang)} of 15th Finance Commission money was still in the GP's account at 31 March ${String(doc.year).slice(-4)}. What is it committed to, and when will it be spent?`,
    paymentMonth && paymentMonth.payments > 0
      ? (hi
        ? `${monthLong(paymentMonth.label, lang)} ${String(doc.year).slice(0, 4)} में ${rupees(paymentMonth.payments, lang)} का सबसे बड़ा भुगतान हुआ। यह किसे, किस वाउचर से और किस काम के लिए दिया गया?`
        : `The largest payment month was ${monthLong(paymentMonth.label, lang)} ${String(doc.year).slice(0, 4)}, when ${rupees(paymentMonth.payments, lang)} went out. Who was paid, under which voucher, and for what?`)
      : null,
    largest && largest.payments > 0
      ? (hi
        ? `सबसे बड़ा भुगतान ${schemeName(largest, lang)} में ${rupees(largest.payments, lang)} का है। यह किस ${completedOne} या बिल का है?`
        : `The largest scheme payment is ${schemeName(largest, lang)} at ${rupees(largest.payments, lang)}. Which ${completedOne} or bill does it settle?`)
      : null,
    works.length
      ? (hi
        ? `पंचायत के रिकॉर्ड में ${works.length} ${completedNoun} हैं, जिनकी कुल लागत ${rupees(gp.worksSummary.approvedCost, lang)} है। क्या हर काम की जगह, बिल, माप पुस्तिका (MB) और जियोटैग फोटो ग्राम सभा को दिखाई जा सकती है?`
        : `The GP records ${works.length} ${completedNoun} worth ${rupees(gp.worksSummary.approvedCost, lang)}. For each, can the Sabha see the location, bill, measurement book and geotag?`)
      : null,
    gp.vendors.rejected
      ? (hi
        ? `${gp.vendors.rejected} विक्रेता पंजीकरण रद्द हुए। कारण क्या था, आवेदक को लिखित में बताया गया, और क्या विक्रेता रजिस्टर सार्वजनिक होगा?`
        : `${gp.vendors.rejected} vendor registrations were rejected. What was the reason, was the applicant told in writing, and will the vendor register be published?`)
      : null,
    hi
      ? `इन कामों में से कौन ग्राम सभा में मंजूर हुआ और कौन बाद में जोड़ा गया?`
      : `Which of these ${planApi ? 'activities' : 'works'} was approved in the Gram Sabha, and which was added later?`,
  ].filter(Boolean);

  return questions;
};

// A WhatsApp-sized summary: the three figures a neighbour needs, then the
// questions. The caller supplies the URL so the text is pure and testable.
export const buildShareText = (doc, { url = '', lang = 'en' } = {}) => {
  const gp = doc.gp;
  const finance = gp.finance;
  const hi = lang === 'hi';
  const questions = buildQuestions(doc, { lang });
  const title = hi ? (gp.nameHi || gp.name) : gp.name;
  const lines = hi
    ? [
      `${title} — ग्राम पंचायत पासबुक, ${doc.year}`,
      `मिला ${rupees(finance.totals.receipts, lang)} · खर्च ${rupees(finance.totals.payments, lang)} · 15वें वित्त आयोग का बचा ${rupees(finance.xvfc.closing, lang)}`,
      '',
      'ग्राम सभा के लिए सवाल:',
      ...questions.map((question, index) => `${index + 1}. ${question}`),
    ]
    : [
      `${title} — Gram Panchayat passbook, ${doc.year}`,
      `Received ${rupees(finance.totals.receipts, lang)} · Paid ${rupees(finance.totals.payments, lang)} · 15th FC balance ${rupees(finance.xvfc.closing, lang)}`,
      '',
      'Questions for the Gram Sabha:',
      ...questions.map((question, index) => `${index + 1}. ${question}`),
    ];
  if (url) lines.push('', hi ? `पूरा रिकॉर्ड: ${url}` : `Read the record: ${url}`);
  return lines.join('\n');
};

// A ready-to-file RTI application. It names the figures already on the page and
// asks for the records a resident cannot see: bills, vouchers, payees, the
// measurement book, geotags and the vendor register. The applicant fills in
// the four bracketed fields; the page does not pretend to know them.
export const buildRtiText = (doc, { lang = 'en' } = {}) => {
  const gp = doc.gp;
  const hi = lang === 'hi';
  const works = gp.works || [];
  const paymentMonth = topMonth(gp.finance.months, 'payments');
  const activities = works.map((work) => hi
    ? `- ${work.activityCode} — ${work.name} — दर्ज लागत ${rupees(work.approvedCost, lang)} — पूर्ण ${dateLabel(work.completedOn, lang)}`
    : `- ${work.activityCode} — ${work.name} — recorded cost ${rupees(work.approvedCost, lang)} — completed ${dateLabel(work.completedOn, lang)}`);

  if (hi) {
    return [
      'प्रति,',
      'जन सूचना अधिकारी',
      `ग्राम पंचायत ${gp.nameHi || gp.name}`,
      `प्रखंड ${placeName(doc.block.name, lang)}, जिला ${placeName(doc.district.name, lang)}, ${placeName(doc.state.name, lang)}`, 
      '',
      `विषय: सूचना का अधिकार अधिनियम, 2005 के अंतर्गत सूचना — ग्राम पंचायत ${gp.nameHi || gp.name}, वित्त वर्ष ${doc.year}`,
      '',
      'महोदय/महोदया,',
      '',
      `कृपया ${doc.year} के लिए निम्नलिखित सूचना उपलब्ध कराएँ:`,
      '1. नीचे दिए गए प्रत्येक कार्य की माप पुस्तिका (MB), मस्टर रोल, बिल, वाउचर और भुगतान आदेश की प्रमाणित प्रतियाँ।',
      '2. नीचे दिए गए सबसे बड़े भुगतान माह के प्रत्येक भुगतान का प्राप्तकर्ता (नाम/एजेंसी), वाउचर संख्या और राशि।',
      '3. इन कार्यों को मंजूरी देने वाले ग्राम सभा प्रस्तावों की प्रतियाँ, और बाद में जोड़े गए कार्यों का विवरण।',
      '4. विक्रेता पंजीकरण रजिस्टर, जिसमें प्रत्येक रद्द आवेदन का दर्ज कारण भी शामिल हो।',
      '',
      'कार्य:',
      ...activities,
      '',
      paymentMonth && paymentMonth.payments > 0
        ? `सबसे बड़ा भुगतान माह: ${monthLong(paymentMonth.label, lang)} — ${rupees(paymentMonth.payments, lang)}।`
        : '',
      `यह अनुरोध eGramSwaraj से ${dateLabel(doc.generatedAt.slice(0, 10), lang)} को लिए गए रिकॉर्ड पर आधारित है। डेटा हैश: ${doc.dataHash}`,
      '',
      'आवेदक: [नाम]',
      'पता: [पता]',
      'फोन: [फोन]',
      'दिनांक: [दिनांक]',
    ].filter((line) => line !== '').join('\n');
  }

  return [
    'To,',
    'The Public Information Officer',
    `Gram Panchayat ${gp.name}`,
    `Block ${placeName(doc.block.name, lang)}, District ${placeName(doc.district.name, lang)}, ${placeName(doc.state.name, lang)}`, 
    '',
    `Subject: Information under the Right to Information Act, 2005 — Gram Panchayat ${gp.name}, financial year ${doc.year}`,
    '',
    'Sir/Madam,',
    '',
    `Please provide the following information for ${doc.year}:`,
    '1. Certified copies of the measurement book (MB), muster roll, bill, voucher and payment order for each activity listed below.',
    '2. The payee name or agency, voucher number and amount for every payment in the largest payment month below.',
    '3. Copies of the Gram Sabha resolutions that approved these activities, and details of any activity added later.',
    '4. The vendor registration register, including the reason recorded for each rejected application.',
    '',
    'Activities:',
    ...activities,
    '',
    paymentMonth && paymentMonth.payments > 0
      ? `Largest payment month: ${monthLong(paymentMonth.label, lang)} — ${rupees(paymentMonth.payments, lang)}.`
      : '',
    `This request is based on the record captured from eGramSwaraj on ${dateLabel(doc.generatedAt.slice(0, 10), lang)}. Data hash: ${doc.dataHash}`,
    '',
    'Applicant: [name]',
    'Address: [address]',
    'Phone: [phone]',
    'Date: [date]',
  ].filter((line) => line !== '').join('\n');
};

// The pilot is one block in one district. These are the entries published in
// the Rural Development Department's official directory on 30 October 2026;
// the page links to that directory so a reader can check them before calling.
// When the pilot expands, this block-specific card must be replaced with a
// lookup, not copied to another district.
export const PILOT_CONTACTS = {
  checkedOn: '30 October 2026',
  directory: 'https://ukrd.uk.gov.in/directory/',
  block: {
    role: 'Block Development Officer, Doiwala',
    email: 'bdodoiwala@gmail.com',
    address: 'Block Development Office, Doiwala',
  },
  district: {
    role: 'Chief Development Officer, Dehradun',
    email: 'cdodoon@gmail.com',
    phone: '0135-2712569',
    mobile: '8057322222',
    address: 'Office of the Chief Development Officer, Dehradun',
  },
  helpline: {
    role: 'CM Helpline',
    phone: '1905',
    url: 'https://cmhelpline.uk.gov.in/',
  },
  rti: {
    role: 'RTI Online Uttarakhand',
    url: 'https://rtionline.uk.gov.in/',
  },
};
