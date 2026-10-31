// The house motto in the 22 scheduled languages, for the ribbon's language
// deck. Each string is a working translation supplied for this surface, not an
// official text; the site's legal ledger is a separate file with its own
// sources. The brand stays in Latin letters, as a name does.
//
// `dir` follows the script used in this set, not the language's usual script:
// Sindhi here is written in Devanagari, so it runs left to right even though
// the language's endonym in languages.js is Perso-Arabic. Kashmiri and Urdu
// are Perso-Arabic and run right to left.
//
// `SPEECH_TAGS` is the BCP 47 tag handed to the speech engine. The region is
// added because desk voices are installed as e.g. ta-IN, not ta.

export const MOTTOS = {
  as: { text: 'THS - গণতন্ত্ৰৰ পঞ্চম স্তম্ভ', dir: 'ltr' },
  bn: { text: 'THS - গণতন্ত্রের পঞ্চম স্তম্ভ', dir: 'ltr' },
  brx: { text: 'THS - गनतन्त्रनि बाथि खुन्था', dir: 'ltr' },
  doi: { text: 'THS - लोकतंत्र दा पंजमां खम्भा', dir: 'ltr' },
  gu: { text: 'THS - લોકશાહીનો પાંચમો સ્તંભ', dir: 'ltr' },
  hi: { text: 'THS - लोकतंत्र का पांचवां स्तंभ', dir: 'ltr' },
  kn: { text: 'THS - ಪ್ರಜಾಪ್ರಭುತ್ವದ ಐದನೇ ಆಧಾರಸ್ತಂಭ', dir: 'ltr' },
  ks: { text: 'THS - جمہوریتُک پونٛژِم تھمب', dir: 'rtl' },
  kok: { text: 'THS - लोकशायेचो पांचवो खांबो', dir: 'ltr' },
  mai: { text: 'THS - लोकतंत्रक पाँचम स्तंभ', dir: 'ltr' },
  ml: { text: 'THS - ജനാധിപത്യത്തിന്റെ അഞ്ചാമത്തെ തൂണ്', dir: 'ltr' },
  mni: { text: 'THS - ꯗꯦꯃꯣꯀ꯭ꯔꯦꯁꯤꯒꯤ ꯃꯉꯥꯁꯨꯕ ꯌꯨꯝꯕꯤ', dir: 'ltr' },
  mr: { text: 'THS - लोकशाहीचा पाचवा स्तंभ', dir: 'ltr' },
  ne: { text: 'THS - लोकतन्त्रको पाँचौं खम्बा', dir: 'ltr' },
  or: { text: 'THS - ଗଣତନ୍ତ୍ରର ପଞ୍ଚମ ସ୍ତମ୍ଭ', dir: 'ltr' },
  pa: { text: 'THS - ਲੋਕਤੰਤਰ ਦਾ ਪੰਜਵਾਂ ਥੰਮ੍ਹ', dir: 'ltr' },
  sa: { text: 'THS - लोकतन्त्रस्य पञ्चमः स्तम्भः', dir: 'ltr' },
  sat: { text: 'THS - ᱞᱚᱠᱛᱚᱱᱛᱨᱚ ᱨᱮᱭᱟᱜ ᱢᱚᱬᱮᱭᱟᱜ ᱠᱷᱩᱱᱴᱤ', dir: 'ltr' },
  sd: { text: 'THS - जम्हूरियत जो पंजों थंभो', dir: 'ltr' },
  ta: { text: 'THS - ஜனநாயகத்தின் ஐந்தாவது தூண்', dir: 'ltr' },
  te: { text: 'THS - ప్రజాస్వామ్య ఐదవ మూలస్తంభం', dir: 'ltr' },
  ur: { text: 'THS - جمہوریت کا پانچواں ستون', dir: 'rtl' },
};

export const SPEECH_TAGS = {
  as: 'as-IN',
  bn: 'bn-IN',
  brx: 'brx-IN',
  doi: 'doi-IN',
  gu: 'gu-IN',
  hi: 'hi-IN',
  kn: 'kn-IN',
  ks: 'ks-IN',
  kok: 'kok-IN',
  mai: 'mai-IN',
  ml: 'ml-IN',
  mni: 'mni-IN',
  mr: 'mr-IN',
  ne: 'ne-IN',
  or: 'or-IN',
  pa: 'pa-IN',
  sa: 'sa-IN',
  sat: 'sat-IN',
  sd: 'sd-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  ur: 'ur-IN',
};
