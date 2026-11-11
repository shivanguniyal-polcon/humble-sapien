// The word Sampark in the scripts the page is read in.
//
// Eight scripts for the eight languages the contact label is supplied in.
// Each entry is a BCP-47 tag so the browser can pick the right font and a
// screen reader can pronounce it; Urdu is marked right-to-left so the strip
// does not have to rely on bidi guessing.

export const SAMPARK_SCRIPTS = [
  ['hi', 'संपर्क'],
  ['bn', 'সম্পর্ক'],
  ['gu', 'સંપર્ક'],
  ['ta', 'தொடர்பு'],
  ['te', 'సంపర్కం'],
  ['kn', 'ಸಂಪರ್ಕ'],
  ['ml', 'സമ്പർക്കം'],
  ['ur', 'رابطہ'],
];

// Scripts written right to left. Only Urdu on this page today; the set keeps
// the direction explicit where a future locale joins.
export const RTL_SCRIPTS = new Set(['ur']);
