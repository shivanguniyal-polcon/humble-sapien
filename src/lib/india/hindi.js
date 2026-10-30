// The Hindi letter's vocabulary.
//
// A Hindi complaint cannot carry an English office name in the address line
// and still be a Hindi letter. The offices repeat across the ladder, so the
// names are kept once, keyed by the English name the data already holds. A
// name that is not here falls back to the English one, which is readable in
// an Indian office; it is never guessed.
//
// This is a letter vocabulary, not a translation of the page. The page stays
// English until a reviewed translation exists for every line a citizen reads.

export const OFFICE_HI = {
  'Gram Panchayat': 'ग्राम पंचायत',
  'Programme Officer': 'कार्यक्रम अधिकारी',
  'District Programme Coordinator': 'जिला कार्यक्रम समन्वयक',
  'State Government': 'राज्य सरकार',
  'Central Employment Guarantee Council': 'केंद्रीय रोजगार गारंटी परिषद',
  'Ministry of Rural Development': 'ग्रामीण विकास मंत्रालय',
  'Common Service Centre or empanelled hospital helpdesk':
    'सामान्य सेवा केंद्र या सूचीबद्ध अस्पताल का सहायता डेस्क',
  'Block facilitation centre': 'खंड सहायता केंद्र',
  'State Health Agency field office': 'राज्य स्वास्थ्य एजेंसी का क्षेत्रीय कार्यालय',
  'State Health Agency': 'राज्य स्वास्थ्य एजेंसी',
  'Central Grievance Redressal Management System': 'केंद्रीय शिकायत निवारण प्रबंधन प्रणाली',
  'Empanelled hospital helpdesk': 'सूचीबद्ध अस्पताल का सहायता डेस्क',
  'Village revenue office': 'ग्राम राजस्व कार्यालय',
  'Block agriculture or revenue office': 'खंड कृषि या राजस्व कार्यालय',
  'District agriculture office': 'जिला कृषि कार्यालय',
  'State nodal office': 'राज्य नोडल कार्यालय',
  'PM-KISAN portal': 'पीएम-किसान पोर्टल',
  'Block agriculture office': 'खंड कृषि कार्यालय',
  'Block rural development office': 'खंड ग्रामीण विकास कार्यालय',
  'District rural development office': 'जिला ग्रामीण विकास कार्यालय',
  'State Rural Housing Mission': 'राज्य ग्रामीण आवास मिशन',
  'PMAY-G portal': 'पीएमएवाई-जी पोर्टल',
  'Urban local body': 'शहरी स्थानीय निकाय',
  'Block office': 'खंड कार्यालय',
  'District urban mission': 'जिला शहरी मिशन',
  'PM SVANidhi portal': 'पीएम स्वनिधि पोर्टल',
  'Electricity distribution company camp': 'बिजली वितरण कंपनी का शिविर',
  'Electricity distribution company division': 'बिजली वितरण कंपनी का प्रमंडल',
  'State electricity distribution company or power department':
    'राज्य बिजली वितरण कंपनी या विद्युत विभाग',
  'Rural Electrification Corporation': 'ग्रामीण विद्युतीकरण निगम',
};

export const WHERE_HI = {
  'The Gram Panchayat office': 'ग्राम पंचायत कार्यालय',
  'The block panchayat or block development office': 'खंड पंचायत या खंड विकास कार्यालय',
  'The District Collector’s office or the Zila Parishad': 'जिला कलेक्टर कार्यालय या जिला परिषद',
  'The District Collector’s office': 'जिला कलेक्टर कार्यालय',
  'The State rural development department': 'राज्य ग्रामीण विकास विभाग',
  'The MIS officer directory, then the Ministry': 'एमआईएस अधिकारी निर्देशिका, फिर मंत्रालय',
  'The MIS officer directory for your district and block':
    'आपके जिले और खंड की एमआईएस अधिकारी निर्देशिका',
  'The nearest CSC, or the helpdesk of an empanelled hospital':
    'निकटतम सीएससी या सूचीबद्ध अस्पताल का सहायता डेस्क',
  'The block health office': 'खंड स्वास्थ्य कार्यालय',
  'The district health office': 'जिला स्वास्थ्य कार्यालय',
  'The State SHA, or the helpline 14555 for the State number':
    'राज्य स्वास्थ्य एजेंसी, या राज्य का नंबर पाने के लिए हेल्पलाइन 14555',
  'The State SHA, or the helpline 14555': 'राज्य स्वास्थ्य एजेंसी, या हेल्पलाइन 14555',
  'The hospital helpdesk, before you leave': 'जाने से पहले अस्पताल का सहायता डेस्क',
  'The village revenue office, or the Block Revenue office':
    'ग्राम राजस्व कार्यालय, या खंड राजस्व कार्यालय',
  'The block office': 'खंड कार्यालय',
  'The District Collector’s office, or the district agriculture office':
    'जिला कलेक्टर कार्यालय, या जिला कृषि कार्यालय',
  'The State nodal officer listed on the PM-KISAN portal':
    'पीएम-किसान पोर्टल पर दिया गया राज्य नोडल अधिकारी',
  'The village revenue office': 'ग्राम राजस्व कार्यालय',
  'The district agriculture office': 'जिला कृषि कार्यालय',
  'The block panchayat or DRDA office': 'खंड पंचायत या डीआरडीए कार्यालय',
  'The municipal office or the ward office': 'नगर पालिका कार्यालय या वार्ड कार्यालय',
  'The district urban mission office': 'जिला शहरी मिशन कार्यालय',
  'The State nodal officer listed on the portal': 'पोर्टल पर दिया गया राज्य नोडल अधिकारी',
  'The local electricity office, or the camp in your village':
    'स्थानीय बिजली कार्यालय, या आपके गाँव में लगा शिविर',
  'The division office': 'प्रमंडल कार्यालय',
  'The State power department or the company’s State office':
    'राज्य विद्युत विभाग या कंपनी का राज्य कार्यालय',
};

export const officeHi = (value) => OFFICE_HI[value] || value;
export const whereHi = (value) => WHERE_HI[value] || value;
