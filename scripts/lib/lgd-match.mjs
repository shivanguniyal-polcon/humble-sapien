// Name matching for the Local Government Directory join.
//
// The locator's names come from a Census-era transliteration of the LGD.
// The directory itself has moved on: districts have been renamed, split and
// respelled. Exact matching handles most of it; this module adds the two
// things exact matching cannot do without guessing:
//
//   1. A short, explicit table of official renames. Every entry is a pair of
//      names for the same district, not a similarity guess. This is where a
//      reviewer should look first if a code is disputed.
//   2. Jaro-Winkler similarity for spelling variants such as "Lohraiya" and
//      "Lohariya". It is used only when no exact or renamed match exists, and
//      only when the best candidate is clearly ahead of the second. A close
//      call returns null, which leaves the code blank.
//
// Nothing here invents a code. A null result is a valid result.

export const LGD_SNAPSHOT = '2026-10-26';
export const LGD_SNAPSHOT_LABEL = '26 October 2026';

// Fold case, diacritics, punctuation, parenthetical qualifiers and a leading
// "the". "Sitanagar (Rv)" and "Sitanagar" are one name; "North  Middle" and
// "North And Middle" are one name.
export function normLgd(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/^the\s+/, '');
}

// Jaro similarity, followed by the Winkler prefix boost. Both strings are
// expected to be normalised already.
export function jaro(a, b) {
  if (a === b) return 1;
  const la = a.length;
  const lb = b.length;
  if (!la || !lb) return 0;

  const window = Math.max(0, Math.floor(Math.max(la, lb) / 2) - 1);
  const seenA = new Uint8Array(la);
  const seenB = new Uint8Array(lb);
  let matches = 0;

  for (let i = 0; i < la; i += 1) {
    const start = Math.max(0, i - window);
    const end = Math.min(i + window + 1, lb);
    for (let j = start; j < end; j += 1) {
      if (!seenB[j] && b[j] === a[i]) {
        seenA[i] = 1;
        seenB[j] = 1;
        matches += 1;
        break;
      }
    }
  }
  if (!matches) return 0;

  let k = 0;
  let transpositions = 0;
  for (let i = 0; i < la; i += 1) {
    if (!seenA[i]) continue;
    while (!seenB[k]) k += 1;
    if (a[i] !== b[k]) transpositions += 1;
    k += 1;
  }
  transpositions = Math.floor(transpositions / 2);

  return (
    (matches / la + matches / lb + (matches - transpositions) / matches) / 3
  );
}

export function jaroWinkler(a, b) {
  const base = jaro(a, b);
  let prefix = 0;
  while (prefix < 4 && prefix < a.length && prefix < b.length && a[prefix] === b[prefix]) {
    prefix += 1;
  }
  return base + prefix * 0.1 * (1 - base);
}

// A candidate list is a list of objects with at least `name` and `norm`.
// Returns the best candidate only when it passes both the score floor and the
// margin over the runner-up. That margin is what stops two nearby villages
// from being silently swapped.
export function bestMatch(name, candidates, { threshold = 0.89, margin = 0.03 } = {}) {
  const needle = normLgd(name);
  if (!needle) return null;

  let best = null;
  let bestScore = 0;
  let secondScore = 0;

  for (const candidate of candidates) {
    const hay = candidate.norm || normLgd(candidate.name);
    if (!hay) continue;
    if (Math.abs(hay.length - needle.length) > 6) continue;
    if (hay[0] !== needle[0] && hay.slice(0, 2) !== needle.slice(0, 2)) continue;

    const score = jaroWinkler(needle, hay);
    if (score > bestScore) {
      secondScore = bestScore;
      bestScore = score;
      best = candidate;
    } else if (score > secondScore) {
      secondScore = score;
    }
  }

  if (!best || bestScore < threshold) return null;
  if (bestScore - secondScore < margin) return null;
  return { candidate: best, score: bestScore };
}

// Old or Census-era name -> current LGD name, keyed by LGD state code and the
// normalised old name. A rename that applies in more than one state is listed
// once under each state, so the state context is never inferred.
//
// This table is deliberately explicit. A fuzzy matcher would get some of
// these right, but a wrong district code is worse than a blank one.
export const DISTRICT_ALIASES = {
  1: {
    baramula: 'Baramulla',
    shupiyan: 'Shopian',
    badgam: 'Budgam',
    punch: 'Poonch',
    bandipore: 'Bandipora',
  },
  2: {
    'lahul spiti': 'Lahaul And Spiti',
  },
  3: {
    muktsar: 'Sri Muktsar Sahib',
    firozpur: 'Ferozepur',
    'sahibzada ajit singh nagar': 'S.A.S Nagar',
  },
  5: {
    garhwal: 'Pauri Garhwal',
    hardwar: 'Haridwar',
  },
  6: {
    gurgaon: 'Gurugram',
    mewat: 'Nuh',
  },
  8: {
    jhunjhunun: 'Jhunjhunu',
    chittaurgarh: 'Chittorgarh',
    jalor: 'Jalore',
    dhaulpur: 'Dholpur',
  },
  9: {
    'kanshiram nagar': 'Kasganj',
    samli: 'Shamli',
    'mahamaya nagar': 'Hathras',
    'jyotiba phule nagar': 'Amroha',
    faizabad: 'Ayodhya',
    'sant ravidas nagar': 'Bhadohi',
    allahabad: 'Prayagraj',
  },
  10: {
    kaimur: 'Kaimur (Bhabua)',
    'purba champaran': 'Purbi Champaran',
  },
  15: {
    saiha: 'Siaha',
  },
  16: {
    sipahijula: 'Sepahijala',
    unokoti: 'Unakoti',
  },
  17: {
    ribhoi: 'Ri Bhoi',
  },
  18: {
    morigaon: 'Marigaon',
    karimganj: 'Sribhumi',
    'karbi anglong east': 'Karbi Anglong',
    'karbi anglong west': 'West Karbi Anglong',
    'south salmara mankachar': 'South Salmara Mancachar',
  },
  19: {
    maldah: 'Malda',
    'south twenty four parganas': 'South 24 Parganas',
    darjiling: 'Darjeeling',
    haora: 'Howrah',
    'north twenty four parganas': 'North 24 Parganas',
    puruliya: 'Purulia',
    'koch bihar': 'Cooch Behar',
    hugli: 'Hooghly',
    'paschim barddhaman': 'Paschim Bardhaman',
  },
  20: {
    'pashchimi singhbhum': 'West Singhbhum',
    'purbi singhbhum': 'East Singhbhum',
    kodarma: 'Koderma',
    sahibganj: 'Sahebganj',
  },
  21: {
    anugul: 'Anugola',
    debagarh: 'Debagada',
    nabarangapur: 'Nabarangpur',
    bargarh: 'Baragada',
    kandhamal: 'Kandhamala',
    nayagarh: 'Nayagada',
    cuttack: 'Kataka',
    jajapur: 'Jajpur',
    baudh: 'Boudh',
    kendrapara: 'Kendrapada',
    sundargarh: 'Sundaragada',
  },
  22: {
    bemetra: 'Bemetara',
    gariaband: 'Gariyaband',
    balrampur: 'Balrampur-Ramanujganj',
    'baloda bazar': 'Balodabazar-Bhatapara',
    koriya: 'Korea',
    'gaurella pendra marwahi': 'Gaurela-Pendra-Marwahi',
  },
  23: {
    hoshangabad: 'Narmadapuram',
    khandwa: 'Khandwa (East Nimar)',
    agar: 'Agar-Malwa',
    khargone: 'Khargone (West Nimar)',
  },
  24: {
    ahmadabad: 'Ahmedabad',
    'chhota udaipur': 'Chhotaudepur',
    batod: 'Botad',
    aravali: 'Arvalli',
    dohad: 'Dahod',
    'the dangs': 'Dangs',
  },
  27: {
    ahmadnagar: 'Ahilyanagar',
    osmanabad: 'Dharashiv',
    gondiya: 'Gondia',
    aurangabad: 'Chhatrapati Sambhajinagar',
    buldana: 'Buldhana',
    raigarh: 'Raigad',
    bid: 'Beed',
  },
  28: {
    anantapur: 'Ananthapuramu',
    kadapa: 'Y.S.R. Kadapa',
  },
  29: {
    mysore: 'Mysuru',
    chikmagalur: 'Chikkamagaluru',
    bijapur: 'Vijayapura',
    davanagere: 'Davanagere',
    chamarajanagar: 'Chamarajanagar',
    gulbarga: 'Kalaburagi',
    bagalkot: 'Bagalkote',
    shimoga: 'Shivamogga',
    bellary: 'Ballari',
    'bangalore rural': 'Bengaluru Rural',
    tumkur: 'Tumakuru',
    belgaum: 'Belagavi',
    bangalore: 'Bengaluru Urban',
  },
  31: {
    lakshadweep: 'Lakshadweep District',
  },
  33: {
    chengalputtu: 'Chengalpattu',
  },
  35: {
    'north middle andaman': 'North And Middle Andaman',
    'south andaman': 'South Andamans',
  },
  36: {
    jangaon: 'Jangoan',
    bhadradri: 'Bhadradri Kothagudem',
    hydrabad: 'Hyderabad',
    rangareddy: 'Ranga Reddy',
    'komaram bheem': 'Kumuram Bheem Asifabad',
    jagtial: 'Jagitial',
    jayashankar: 'Jayashankar Bhupalapally',
    'yadadri bhongiri': 'Yadadri Bhuvanagiri',
    medchal: 'Medchal Malkajgiri',
    jogulamba: 'Jogulamba Gadwal',
  },
  37: {
    leh: 'Leh Ladakh',
  },
  38: {
    'dadra nagar haveli': 'Dadra And Nagar Haveli',
  },
};
