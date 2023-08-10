// Rule-based Hindi layer: recognized statutory terms and clause templates.
// Honest scope: terms and clause types are translated reliably; arbitrary
// connective prose may remain in English. The UI labels this and advises
// translator review before formal use.

export const hindiTerms = [
  ['notwithstanding anything contained in', 'किसी भी अन्य कानून के बावजूद'],
  ['notwithstanding', 'के बावजूद'],
  ['the Central Government', 'केंद्र सरकार'],
  ['Central Government', 'केंद्र सरकार'],
  ['State Governments', 'राज्य सरकारें'],
  ['the Official Gazette', 'राजपत्र में'],
  ['Official Gazette', 'राजपत्र'],
  ['prior consultation', 'पहले विचार-विमर्श'],
  ['the beneficiaries', 'लाभार्थियों'],
  ['beneficiaries', 'लाभार्थी'],
  ['every beneficiary', 'हर लाभार्थी'],
  ['the benefits', 'लाभ'],
  ['benefits', 'लाभ'],
  ['this Act', 'यह अधिनियम'],
  ['the rules', 'नियम'],
  ['rules', 'नियम'],
  ['in force today', 'लागू'],
  ['must', 'को अनिवार्य रूप से'],
  ['may', 'कर सकती है'],
  ['but', 'लेकिन'],
  ['if', 'यदि'],
  ['before', 'से पहले'],
  ['after', 'के बाद'],
  ['despite', 'के बावजूद'],
  ['under', 'के अंतर्गत'],
  ['starting', 'से प्रारंभ'],
  ['called', 'कहा जाएगा'],
  ['counts as', 'माना जाएगा'],
  ['among other things', 'अन्य बातों के साथ'],
  ['mentioned earlier', 'पहले वर्णित'],
  ['does not mean', 'का अर्थ नहीं है'],
  ['without limiting', 'को सीमित किए बिना'],
  ['including', 'सहित'],
  ['set the detailed rules', 'विस्तृत नियम बना सकती है'],
  ['make rules', 'नियम बना सकती है'],
  ['an official notice', 'एक आधिकारिक सूचना'],
  ['Everyone covered', 'हर पात्र व्यक्ति'],
  ['can get', 'प्राप्त कर सकता है'],
  ['can use', 'उपयोग कर सकता है'],
  ['as per', 'के अनुसार'],
  ['about', 'के बारे में'],
];

// Clause templates used when a sentence matches a recognized pattern.
export const clauseTemplates = [
  {
    // Obligation: X must Y
    test: (s) => /\b(must|required to)\b/i.test(s),
    render: (s) => {
      const m = s.match(/^(.+?)\s+(?:must|is required to)\s+(.+?)[.,]?$/i);
      if (!m) return null;
      return `${translateTerms(m[1])} को ${translateTerms(m[2])} करना होगा।`;
    },
  },
  {
    // Permission: X may/can Y
    test: (s) => /\b(may|can)\b/i.test(s),
    render: (s) => {
      const m = s.match(/^(.+?)\s+(?:may|can)\s+(.+?)[.,]?$/i);
      if (!m) return null;
      return `${translateTerms(m[1])} ${translateTerms(m[2])} कर सकती है।`;
    },
  },
  {
    // Prohibition: no X shall be Y / X must not Y
    test: (s) => /\b(no |must not|shall not)\b/i.test(s),
    render: (s) => `${translateTerms(s)}: निषेध/शर्त वाला वाक्य, अनुवाद की पुष्टि करें।`,
  },
];

export const translateTerms = (fragment) => {
  let out = ` ${fragment} `;
  for (const [en, hi] of hindiTerms) {
    out = out.replace(new RegExp(`\\b${en}\\b`, 'gi'), hi);
  }
  return out.replace(/\s{2,}/g, ' ').trim();
};

export const renderHindi = (sentence) => {
  for (const t of clauseTemplates) {
    if (t.test(sentence)) {
      const rendered = t.render(sentence);
      if (rendered) return { text: rendered, template: true };
    }
  }
  return { text: translateTerms(sentence), template: false };
};

export const hindiNote =
  'नियम-आधारित अनुवाद: पहचाने गए शब्द और वाक्य-प्रकार हिंदी में; शेष अंग्रेज़ी में रह सकता है। औपचारिक उपयोग से पहले अनुवादक से जाँच कराएँ। (Rule-based: recognized terms and clause types render in Hindi; connective prose may stay in English. Verify with a translator before formal use.)';
