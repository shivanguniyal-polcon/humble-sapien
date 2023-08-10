// THS: local solutions knowledge base.
// Each entry: a grassroots fix, the policy touchpoint it speaks to, how it
// works, and the evidence behind the claim. Entries are real, documented
// practices; wording stays descriptive and attributable.

export const solutions = [
  {
    id: 'mitticool',
    name: 'Mitticool: the clay refrigerator',
    region: 'Gujarat',
    category: 'Cooling',
    touchpoint: 'Household cooling & energy access',
    howItWorks:
      'Unglazed clay holds a small reservoir of water; evaporation pulls heat out of the cabinet above it. Vegetables stay fresh for a few days and drinking water stays cool: no electricity, no moving parts.',
    evidence:
      'Created by potter Mansukhbhai Prajapati and widely documented as a frugal-innovation case; sold as a working product, not a prototype.',
  },
  {
    id: 'matka',
    name: 'Matka: earthen pot cooling',
    region: 'Western & North India',
    category: 'Cooling',
    touchpoint: 'Household cooling & energy access',
    howItWorks:
      'The same evaporative principle as the clay fridge, at zero cost: porous clay keeps water several degrees below ambient temperature through the day.',
    evidence:
      'A centuries-old household practice, still in daily use; one of the natural-cooling techniques the founder catalogued at tapris.',
  },
  {
    id: 'cooling-panels',
    name: 'Cow-dung & coco-peat wall panels',
    region: 'Documented across western India',
    category: 'Cooling',
    touchpoint: 'Building energy & urban heat',
    howItWorks:
      'Wall panels of cow dung or coco peat absorb heat and release it slowly, cutting indoor temperatures and air-conditioning load in low-rise construction.',
    evidence:
      'Named in the founder’s field notes on frugal cooling as an alternative to mechanical air conditioning.',
  },
  {
    id: 'bamboo-drip',
    name: 'Bamboo drip irrigation',
    region: 'Khasi & Jaintia Hills, Meghalaya',
    category: 'Water',
    touchpoint: 'Irrigation & smallholder water',
    howItWorks:
      'Streams above the plots are tapped and led downhill through bamboo pipes that drip water onto betel leaf, pepper and turmeric terraces: gravity-fed, zero energy, and repairable with local material.',
    evidence:
      'A roughly two-hundred-year-old practice maintained by the farmers themselves; frequently cited in grassroots-technology documentation.',
  },
  {
    id: 'bhungroo',
    name: 'Bhungroo: rainwater injection well',
    region: 'Gujarat',
    category: 'Water',
    touchpoint: 'Groundwater recharge & waterlogging',
    howItWorks:
      'Surplus monsoon water is injected through a borewell into a deep aquifer and drawn back in the dry months: restoring wells, protecting fields from waterlogging, and managed by women’s groups.',
    evidence:
      'Developed and scaled by Naireeta Services; a recognised case of community-managed water innovation.',
  },
  {
    id: 'patravali',
    name: 'Patravali: stitched leaf plates & cups',
    region: 'Eastern & Central India',
    category: 'Livelihood',
    touchpoint: 'Rural livelihood & solid waste',
    howItWorks:
      'Sal and palash leaves are stitched into plates and cups that go back to the soil after use: replacing disposables and carrying a forest-adjacent craft economy with them.',
    evidence:
      'A revived traditional craft, again in commercial use; a standing example of circular, low-capital production.',
  },
];

export const categories = ['All', ...new Set(solutions.map((s) => s.category))];
