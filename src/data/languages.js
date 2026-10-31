// The 22 languages the Constitution names in the Eighth Schedule.
//
// One list, two uses: the home frontispiece prints them as a specimen, and the
// timeline's language lens asks which catalogue records have an official text
// in each. The list lives here so the two surfaces cannot drift apart.
//
// `code` is the BCP 47 language tag used on the text and in aria labels;
// `endonym` is the language's own name in its own script; `rtl` marks the
// three written in the Perso-Arabic script.

export const LANGUAGES = [
  { name: 'Assamese', endonym: 'অসমীয়া', code: 'as' },
  { name: 'Bengali', endonym: 'বাংলা', code: 'bn' },
  { name: 'Bodo', endonym: "बर'", code: 'brx' },
  { name: 'Dogri', endonym: 'डोगरी', code: 'doi' },
  { name: 'Gujarati', endonym: 'ગુજરાતી', code: 'gu' },
  { name: 'Hindi', endonym: 'हिन्दी', code: 'hi' },
  { name: 'Kannada', endonym: 'ಕನ್ನಡ', code: 'kn' },
  { name: 'Kashmiri', endonym: 'کٲشُر', code: 'ks', rtl: true },
  { name: 'Konkani', endonym: 'कोंकणी', code: 'kok' },
  { name: 'Maithili', endonym: 'मैथिली', code: 'mai' },
  { name: 'Malayalam', endonym: 'മലയാളം', code: 'ml' },
  { name: 'Manipuri', endonym: 'ꯃꯤꯇꯩꯂꯣꯟ', code: 'mni' },
  { name: 'Marathi', endonym: 'मराठी', code: 'mr' },
  { name: 'Nepali', endonym: 'नेपाली', code: 'ne' },
  { name: 'Odia', endonym: 'ଓଡ଼ିଆ', code: 'or' },
  { name: 'Punjabi', endonym: 'ਪੰਜਾਬੀ', code: 'pa' },
  { name: 'Sanskrit', endonym: 'संस्कृतम्', code: 'sa' },
  { name: 'Santali', endonym: 'ᱥᱟᱱᱛᱟᱲᱤ', code: 'sat' },
  { name: 'Sindhi', endonym: 'سنڌي', code: 'sd', rtl: true },
  { name: 'Tamil', endonym: 'தமிழ்', code: 'ta' },
  { name: 'Telugu', endonym: 'తెలుగు', code: 'te' },
  { name: 'Urdu', endonym: 'اردو', code: 'ur', rtl: true },
];

export const LANGUAGE_BY_CODE = Object.fromEntries(LANGUAGES.map((entry) => [entry.code, entry]));
