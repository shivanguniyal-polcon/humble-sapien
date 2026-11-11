// Interface copy added after the first 98-key layer.
//
// These are the strings that used to come straight from the corpus or from
// English helpers: verification dates, deadline and rung status badges, the
// sheet's due line and language choices, directory annotations, the trap
// framing, the rung decision label and the script specimen's accessible name.
//
// Source data stays source data: office names and posts, scheme names,
// summaries and notes, address values, source URLs, LGD/map codes and the
// legal letter are not translated here. Every other string in this file is
// page chrome and must exist in every locale; copyFor() does not fill a
// missing key from English.

export const SAMPARK_UI_EXTRA = {
  en: {
    verifyUndated: 'No check date recorded. Confirm this before relying on it.',
    verifyStale: 'Checked {checked}. Re-check overdue since {due}.',
    verifyDue: 'Checked {checked}. Re-check due {due}.',
    deadlineStatutoryLabel: 'Set by law',
    deadlineStatutoryDetail:
      'An Act, or a rule made under it, sets this period. It can be quoted in a complaint.',
    deadlineGuidelineLabel: 'Published guideline',
    deadlineGuidelineDetail:
      'The scheme owner publishes this period. Quote it as the scheme’s own rule, not as law.',
    rungStatutoryLabel: 'Created by law',
    rungStatutoryDetail:
      'An Act or the scheme guidelines place this office in the chain.',
    rungOfficialLabel: 'Published by the scheme owner',
    rungOfficialDetail:
      'The ministry or the scheme portal names this office or window.',
    rungVariesLabel: 'Post name varies by state',
    rungVariesDetail:
      'The office exists and does this job, but states name it differently. Ask for the post by the job it does.',
    rungPortalLabel: 'Online window',
    rungPortalDetail: 'This step is done on a portal rather than at a counter.',
    rungDecisionLabel: 'What this office decides',
    sheetDueLine: '{what}. Due on {due}',
    sheetLetterEnglish: 'English',
    sheetLetterHindi: 'Hindi',
    sheetCarryTagline: 'a sheet to carry',
    locatorNoLgd: 'no LGD',
    locatorSourceNote: '{source}, snapshot {date}.',
    locatorLoadError: 'Could not load {place}. Try again.',
    locatorHierarchyNote:
      'The code column is a directory key for this build. The lgd_code column is the official Local Government Directory code, joined by name against the directory snapshot shipped with this build. The gp_code and gp_name columns name the Gram Panchayat where the directory records one. A blank lgd_code means the name was ambiguous or absent; a blank gp_code means the directory records no panchayat for that village. Neither is guessed.',
    trapsNote:
      'A name trap is a name that sounds like the scheme or office you need. The entries below separate the name from the office.',
    scriptSpecimenLabel: 'Sampark in Indian scripts',
    levelNational: 'National',
  },
  hi: {
    verifyUndated: 'जाँच की तारीख़ दर्ज नहीं है। इस पर भरोसा करने से पहले पुष्टि करें।',
    verifyStale: '{checked} को जाँचा गया। {due} से पुनः जाँच बकाया है।',
    verifyDue: '{checked} को जाँचा गया। {due} को पुनः जाँच देय है।',
    deadlineStatutoryLabel: 'क़ानून से तय',
    deadlineStatutoryDetail:
      'कोई अधिनियम या उसके तहत बना नियम यह अवधि तय करता है। इसे शिकायत में उद्धृत किया जा सकता है।',
    deadlineGuidelineLabel: 'प्रकाशित दिशानिर्देश',
    deadlineGuidelineDetail:
      'योजना का स्वामी यह अवधि प्रकाशित करता है। इसे योजना का अपना नियम बताएँ, क़ानून नहीं।',
    rungStatutoryLabel: 'क़ानून से बना',
    rungStatutoryDetail:
      'कोई अधिनियम या योजना दिशानिर्देश इस कार्यालय को श्रृंखला में रखते हैं।',
    rungOfficialLabel: 'योजना स्वामी द्वारा प्रकाशित',
    rungOfficialDetail:
      'मंत्रालय या योजना पोर्टल इस कार्यालय या खिड़की का नाम देता है।',
    rungVariesLabel: 'पद का नाम राज्य के अनुसार बदलता है',
    rungVariesDetail:
      'कार्यालय मौजूद है और यह काम करता है, पर राज्य इसे अलग नाम से बुलाते हैं। पद को उसके काम से पूछें।',
    rungPortalLabel: 'ऑनलाइन खिड़की',
    rungPortalDetail: 'यह चरण काउंटर पर नहीं, पोर्टल पर पूरा होता है।',
    rungDecisionLabel: 'यह कार्यालय क्या तय करता है',
    sheetDueLine: '{what}। देय तिथि {due}',
    sheetLetterEnglish: 'अंग्रेज़ी',
    sheetLetterHindi: 'हिंदी',
    sheetCarryTagline: 'साथ ले जाने वाली शीट',
    locatorNoLgd: 'LGD नहीं',
    locatorSourceNote: '{source}, स्नैपशॉट {date}।',
    locatorLoadError: '{place} लोड नहीं हो सका। फिर कोशिश करें।',
    locatorHierarchyNote:
      'कोड कॉलम इस बिल्ड की निर्देशिका कुंजी है। lgd_code कॉलम आधिकारिक स्थानीय शासन निर्देशिका (LGD) कोड है, जिसे इस बिल्ड के साथ भेजे गए निर्देशिका स्नैपशॉट से नाम के आधार पर जोड़ा गया है। gp_code और gp_name कॉलम उस ग्राम पंचायत का नाम देते हैं जहाँ निर्देशिका में दर्ज हो। खाली lgd_code का अर्थ है नाम अस्पष्ट या अनुपस्थित था; खाली gp_code का अर्थ है उस गाँव के लिए निर्देशिका में कोई पंचायत दर्ज नहीं है। दोनों में से कुछ भी अनुमान से नहीं भरा गया।',
    trapsNote:
      'नाम का जाल ऐसा नाम है जो आपकी ज़रूरत की योजना या कार्यालय जैसा सुनाई देता है। नीचे की प्रविष्टियाँ नाम को कार्यालय से अलग करती हैं।',
    scriptSpecimenLabel: 'भारतीय लिपियों में संपर्क',
    levelNational: 'राष्ट्रीय',
  },
  bn: {
    verifyUndated: 'যাচাইয়ের তারিখ নথিভুক্ত নেই। এটির উপর নির্ভর করার আগে নিশ্চিত করুন।',
    verifyStale: '{checked} তারিখে যাচাই করা হয়েছে। {due} থেকে পুনরায় যাচাই বিলম্বিত।',
    verifyDue: '{checked} তারিখে যাচাই করা হয়েছে। {due} তারিখে পুনরায় যাচাই প্রয়োজন।',
    deadlineStatutoryLabel: 'আইনে নির্ধারিত',
    deadlineStatutoryDetail:
      'কোনও আইন বা তার অধীনে করা নিয়ম এই সময়সীমা নির্ধারণ করে। এটি অভিযোগে উদ্ধৃত করা যায়।',
    deadlineGuidelineLabel: 'প্রকাশিত নির্দেশিকা',
    deadlineGuidelineDetail:
      'প্রকল্পের মালিক এই সময়সীমা প্রকাশ করেন। এটিকে প্রকল্পের নিজস্ব নিয়ম হিসেবে উল্লেখ করুন, আইন হিসেবে নয়।',
    rungStatutoryLabel: 'আইনে সৃষ্ট',
    rungStatutoryDetail:
      'কোনও আইন বা প্রকল্প নির্দেশিকা এই দপ্তরকে শৃঙ্খলে রাখে।',
    rungOfficialLabel: 'প্রকল্পের মালিক দ্বারা প্রকাশিত',
    rungOfficialDetail:
      'মন্ত্রক বা প্রকল্প পোর্টাল এই দপ্তর বা জানালার নাম দেয়।',
    rungVariesLabel: 'পদের নাম রাজ্য অনুযায়ী বদলায়',
    rungVariesDetail:
      'দপ্তরটি আছে এবং এই কাজটি করে, কিন্তু রাজ্যগুলি এটিকে ভিন্ন নামে ডাকে। কাজের ভিত্তিতে পদটি জানতে চান।',
    rungPortalLabel: 'অনলাইন জানালা',
    rungPortalDetail: 'এই ধাপটি কাউন্টারে নয়, পোর্টালে সম্পন্ন হয়।',
    rungDecisionLabel: 'এই দপ্তর কী সিদ্ধান্ত নেয়',
    sheetDueLine: '{what}। নির্ধারিত তারিখ {due}',
    sheetLetterEnglish: 'ইংরেজি',
    sheetLetterHindi: 'হিন্দি',
    sheetCarryTagline: 'সঙ্গে নেওয়ার শিট',
    locatorNoLgd: 'LGD নেই',
    locatorSourceNote: '{source}, স্ন্যাপশট {date}।',
    locatorLoadError: '{place} লোড করা যায়নি। আবার চেষ্টা করুন।',
    locatorHierarchyNote:
      'কোড কলামটি এই বিল্ডের ডিরেক্টরি কী। lgd_code কলামটি সরকারি স্থানীয় শাসন ডিরেক্টরি (LGD) কোড, যা এই বিল্ডের সঙ্গে আসা ডিরেক্টরি স্ন্যাপশটের সঙ্গে নাম মিলিয়ে যুক্ত করা হয়েছে। gp_code ও gp_name কলাম সেই গ্রাম পঞ্চায়েতের নাম দেয় যেখানে ডিরেক্টরিতে একটি রেকর্ড আছে। খালি lgd_code মানে নামটি অস্পষ্ট বা অনুপস্থিত ছিল; খালি gp_code মানে ওই গ্রামের জন্য ডিরেক্টরিতে কোনো পঞ্চায়েত নেই। কোনোটিই অনুমান করে ভরা হয়নি।',
    trapsNote:
      'নামের ফাঁদ এমন নাম যা আপনার প্রয়োজনীয় প্রকল্প বা দপ্তরের মতো শোনায়। নিচের এন্ট্রিগুলি নামটিকে দপ্তর থেকে আলাদা করে।',
    scriptSpecimenLabel: 'ভারতীয় লিপিতে সম্পর্ক',
    levelNational: 'জাতীয়',
  },
  gu: {
    verifyUndated: 'ચકાસણીની તારીખ નોંધાયેલી નથી. તેના પર આધાર રાખતા પહેલા પુષ્ટિ કરો.',
    verifyStale: '{checked} ના રોજ ચકાસાયું. {due} થી ફરી ચકાસણી બાકી છે.',
    verifyDue: '{checked} ના રોજ ચકાસાયું. {due} ના રોજ ફરી ચકાસણી બાકી છે.',
    deadlineStatutoryLabel: 'કાયદાથી નક્કી',
    deadlineStatutoryDetail:
      'કોઈ કાયદો અથવા તેના હેઠળનો નિયમ આ સમયગાળો નક્કી કરે છે. તેને ફરિયાદમાં ટાંકી શકાય છે.',
    deadlineGuidelineLabel: 'પ્રકાશિત માર્ગદર્શિકા',
    deadlineGuidelineDetail:
      'યોજનાનો માલિક આ સમયગાળો પ્રકાશિત કરે છે. તેને યોજનાનો પોતાનો નિયમ ગણો, કાયદો નહીં.',
    rungStatutoryLabel: 'કાયદાથી બનેલું',
    rungStatutoryDetail:
      'કાયદો અથવા યોજના માર્ગદર્શિકા આ કચેરીને શૃંખલામાં મૂકે છે.',
    rungOfficialLabel: 'યોજના માલિક દ્વારા પ્રકાશિત',
    rungOfficialDetail:
      'મંત્રાલય અથવા યોજના પોર્ટલ આ કચેરી કે વિન્ડોનું નામ આપે છે.',
    rungVariesLabel: 'હોદ્દાનું નામ રાજ્ય પ્રમાણે બદલાય છે',
    rungVariesDetail:
      'કચેરી અસ્તિત્વમાં છે અને આ કામ કરે છે, પણ રાજ્યો તેને અલગ નામથી બોલાવે છે. હોદ્દો તેના કામ પ્રમાણે પૂછો.',
    rungPortalLabel: 'ઓનલાઇન વિન્ડો',
    rungPortalDetail: 'આ પગલું કાઉન્ટર પર નહીં, પોર્ટલ પર પૂર્ણ થાય છે.',
    rungDecisionLabel: 'આ કચેરી શું નક્કી કરે છે',
    sheetDueLine: '{what}. ચૂકવવાની તારીખ {due}',
    sheetLetterEnglish: 'અંગ્રેજી',
    sheetLetterHindi: 'હિન્દી',
    sheetCarryTagline: 'સાથે લઈ જવાની શીટ',
    locatorNoLgd: 'LGD નથી',
    locatorSourceNote: '{source}, સ્નેપશોટ {date}.',
    locatorLoadError: '{place} લોડ થઈ શક્યું નહીં. ફરી પ્રયાસ કરો.',
    locatorHierarchyNote:
      'કોડ કૉલમ આ બિલ્ડ માટે ડિરેક્ટરી કી છે. lgd_code કૉલમ સત્તાવાર સ્થાનિક શાસન ડિરેક્ટરી (LGD) કોડ છે, જે આ બિલ્ડ સાથે મોકલેલા ડિરેક્ટરી સ્નેપશોટ સામે નામ દ્વારા જોડાયેલો છે. gp_code અને gp_name કૉલમ તે ગ્રામ પંચાયતનું નામ આપે છે જ્યાં ડિરેક્ટરીમાં નોંધ છે. ખાલી lgd_code એટલે નામ અસ્પષ્ટ કે ગેરહાજર હતું; ખાલી gp_code એટલે તે ગામ માટે ડિરેક્ટરીમાં કોઈ પંચાયત નથી. બંનેમાંથી કંઈ પણ અનુમાનથી ભરાયું નથી.',
    trapsNote:
      'નામનો જાળ એવું નામ છે જે તમને જોઈતી યોજના કે કચેરી જેવું સંભળાય છે. નીચેની એન્ટ્રીઓ નામને કચેરીથી અલગ કરે છે.',
    scriptSpecimenLabel: 'ભારતીય લિપિઓમાં સંપર્ક',
    levelNational: 'રાષ્ટ્રીય',
  },
  ta: {
    verifyUndated: 'சரிபார்ப்புத் தேதி பதிவாகவில்லை. இதை நம்புவதற்கு முன் உறுதிப்படுத்தவும்.',
    verifyStale: '{checked} அன்று சரிபார்க்கப்பட்டது. {due} முதல் மறுசரிபார்ப்பு தாமதமாகிவிட்டது.',
    verifyDue: '{checked} அன்று சரிபார்க்கப்பட்டது. {due} அன்று மறுசரிபார்ப்பு வேண்டும்.',
    deadlineStatutoryLabel: 'சட்டத்தால் நிர்ணயிக்கப்பட்டது',
    deadlineStatutoryDetail:
      'ஒரு சட்டம் அல்லது அதன் கீழ் உள்ள விதி இந்தக் காலத்தை நிர்ணயிக்கிறது. இதைப் புகாரில் மேற்கோள் காட்டலாம்.',
    deadlineGuidelineLabel: 'வெளியிடப்பட்ட வழிகாட்டுதல்',
    deadlineGuidelineDetail:
      'திட்ட உரிமையாளர் இந்தக் காலத்தை வெளியிடுகிறார். இதைச் சட்டமாக அல்ல, திட்டத்தின் சொந்த விதியாக மேற்கோள் காட்டுங்கள்.',
    rungStatutoryLabel: 'சட்டத்தால் உருவாக்கப்பட்டது',
    rungStatutoryDetail:
      'ஒரு சட்டம் அல்லது திட்ட வழிகாட்டுதல் இந்த அலுவலகத்தைச் சங்கிலியில் வைக்கிறது.',
    rungOfficialLabel: 'திட்ட உரிமையாளரால் வெளியிடப்பட்டது',
    rungOfficialDetail:
      'அமைச்சகம் அல்லது திட்ட இணையதளம் இந்த அலுவலகம் அல்லது சாளரத்தைப் பெயரிடுகிறது.',
    rungVariesLabel: 'பதவிப் பெயர் மாநிலத்திற்கு மாறுபடும்',
    rungVariesDetail:
      'அலுவலகம் உள்ளது, இந்த வேலையைச் செய்கிறது; ஆனால் மாநிலங்கள் வேறு பெயரில் அழைக்கின்றன. வேலையின் அடிப்படையில் பதவியைக் கேளுங்கள்.',
    rungPortalLabel: 'இணையச் சாளரம்',
    rungPortalDetail: 'இந்தப் படி கவுண்டரில் அல்ல, இணையதளத்தில் முடிகிறது.',
    rungDecisionLabel: 'இந்த அலுவலகம் என்ன முடிவு செய்கிறது',
    sheetDueLine: '{what}. செலுத்த வேண்டிய தேதி {due}',
    sheetLetterEnglish: 'ஆங்கிலம்',
    sheetLetterHindi: 'இந்தி',
    sheetCarryTagline: 'எடுத்துச் செல்லும் தாள்',
    locatorNoLgd: 'LGD இல்லை',
    locatorSourceNote: '{source}, நிலவரம் {date}.',
    locatorLoadError: '{place} ஏற்ற முடியவில்லை. மீண்டும் முயற்சிக்கவும்.',
    locatorHierarchyNote:
      'குறியீட்டு நெடுவரிசை இந்த உருவாக்கத்தின் அடைவு விசை. lgd_code நெடுவரிசை அதிகாரப்பூர்வ உள்ளாட்சி அடைவு (LGD) குறியீடு; இந்த உருவாக்கத்துடன் வரும் அடைவு நிலவரத்துடன் பெயரைப் பொருத்தி இணைக்கப்பட்டது. gp_code மற்றும் gp_name நெடுவரிசைகள் அடைவில் பதிவுள்ள கிராம ஊராட்சியின் பெயரைத் தரும். காலியான lgd_code என்பது பெயர் தெளிவற்றதாக அல்லது இல்லாததாக இருந்தது; காலியான gp_code என்பது அந்தக் கிராமத்திற்கு அடைவில் ஊராட்சி பதிவில்லை. எதுவும் ஊகிக்கப்படவில்லை.',
    trapsNote:
      'பெயர் பொறி என்பது உங்களுக்குத் தேவையான திட்டம் அல்லது அலுவலகம் போல ஒலிக்கும் பெயர். கீழே உள்ள பதிவுகள் பெயரை அலுவலகத்திலிருந்து பிரிக்கின்றன.',
    scriptSpecimenLabel: 'இந்திய எழுத்துகளில் தொடர்பு',
    levelNational: 'தேசிய',
  },
  te: {
    verifyUndated: 'తనిఖీ తేదీ నమోదు కాలేదు. దీనిపై ఆధారపడే ముందు నిర్ధారించుకోండి.',
    verifyStale: '{checked}న తనిఖీ చేయబడింది. {due} నుంచి తిరిగి తనిఖీ ఆలస్యమైంది.',
    verifyDue: '{checked}న తనిఖీ చేయబడింది. {due}న తిరిగి తనిఖీ చేయాలి.',
    deadlineStatutoryLabel: 'చట్టం నిర్ణయించినది',
    deadlineStatutoryDetail:
      'ఒక చట్టం లేదా దాని కింద ఉన్న నియమం ఈ కాలాన్ని నిర్ణయిస్తుంది. దీన్ని ఫిర్యాదులో ఉదహరించవచ్చు.',
    deadlineGuidelineLabel: 'ప్రచురిత మార్గదర్శకం',
    deadlineGuidelineDetail:
      'పథకం యజమాని ఈ కాలాన్ని ప్రచురిస్తారు. దీన్ని చట్టంగా కాకుండా పథకం సొంత నియమంగా ఉదహరించండి.',
    rungStatutoryLabel: 'చట్టం ద్వారా ఏర్పడింది',
    rungStatutoryDetail:
      'ఒక చట్టం లేదా పథకం మార్గదర్శకాలు ఈ కార్యాలయాన్ని గొలుసులో ఉంచుతాయి.',
    rungOfficialLabel: 'పథకం యజమాని ప్రచురించినది',
    rungOfficialDetail:
      'మంత్రిత్వ శాఖ లేదా పథకం పోర్టల్ ఈ కార్యాలయం లేదా విండోను పేర్కొంటుంది.',
    rungVariesLabel: 'పదవి పేరు రాష్ట్రం ప్రకారం మారుతుంది',
    rungVariesDetail:
      'కార్యాలయం ఉంది, ఈ పని చేస్తుంది; కానీ రాష్ట్రాలు వేరే పేరుతో పిలుస్తాయి. పని ఆధారంగా పదవిని అడగండి.',
    rungPortalLabel: 'ఆన్‌లైన్ విండో',
    rungPortalDetail: 'ఈ దశ కౌంటర్‌లో కాకుండా పోర్టల్‌లో పూర్తవుతుంది.',
    rungDecisionLabel: 'ఈ కార్యాలయం ఏమి నిర్ణయిస్తుంది',
    sheetDueLine: '{what}. చెల్లించాల్సిన తేదీ {due}',
    sheetLetterEnglish: 'ఆంగ్లం',
    sheetLetterHindi: 'హిందీ',
    sheetCarryTagline: 'తీసుకెళ్లే షీట్',
    locatorNoLgd: 'LGD లేదు',
    locatorSourceNote: '{source}, స్నాప్‌షాట్ {date}.',
    locatorLoadError: '{place} లోడ్ కాలేదు. మళ్లీ ప్రయత్నించండి.',
    locatorHierarchyNote:
      'కోడ్ నిలువు వరుస ఈ బిల్డ్ కోసం డైరెక్టరీ కీ. lgd_code నిలువు వరుస అధికారిక స్థానిక పరిపాలన డైరెక్టరీ (LGD) కోడ్; ఈ బిల్డ్‌తో పంపిన డైరెక్టరీ స్నాప్‌షాట్‌తో పేరు ద్వారా జోడించబడింది. gp_code మరియు gp_name నిలువు వరుసలు డైరెక్టరీలో నమోదైన గ్రామ పంచాయతీ పేరును తెలియజేస్తాయి. ఖాళీ lgd_code అంటే పేరు అస్పష్టంగా లేదా లేకుండా ఉంది; ఖాళీ gp_code అంటే ఆ గ్రామానికి డైరెక్టరీలో పంచాయతీ నమోదు లేదు. ఏదీ ఊహించి నింపబడలేదు.',
    trapsNote:
      'పేరు ఉచ్చు అంటే మీకు కావలసిన పథకం లేదా కార్యాలయం లాగా వినిపించే పేరు. క్రింది నమోదులు పేరును కార్యాలయం నుంచి వేరు చేస్తాయి.',
    scriptSpecimenLabel: 'భారతీయ లిపులలో సంపర్కం',
    levelNational: 'జాతీయ',
  },
  kn: {
    verifyUndated: 'ಪರಿಶೀಲನಾ ದಿನಾಂಕ ದಾಖಲಾಗಿಲ್ಲ. ಇದನ್ನು ನಂಬುವ ಮೊದಲು ಖಚಿತಪಡಿಸಿ.',
    verifyStale: '{checked} ರಂದು ಪರಿಶೀಲಿಸಲಾಗಿದೆ. {due} ರಿಂದ ಮರುಪರಿಶೀಲನೆ ಬಾಕಿ ಇದೆ.',
    verifyDue: '{checked} ರಂದು ಪರಿಶೀಲಿಸಲಾಗಿದೆ. {due} ರಂದು ಮರುಪರಿಶೀಲನೆ ಬೇಕು.',
    deadlineStatutoryLabel: 'ಕಾನೂನಿನಿಂದ ನಿಗದಿ',
    deadlineStatutoryDetail:
      'ಒಂದು ಕಾಯ್ದೆ ಅಥವಾ ಅದರ ಅಡಿಯಲ್ಲಿ ಮಾಡಿದ ನಿಯಮ ಈ ಅವಧಿಯನ್ನು ನಿಗದಿಪಡಿಸುತ್ತದೆ. ಇದನ್ನು ದೂರಿನಲ್ಲಿ ಉಲ್ಲೇಖಿಸಬಹುದು.',
    deadlineGuidelineLabel: 'ಪ್ರಕಟಿತ ಮಾರ್ಗಸೂಚಿ',
    deadlineGuidelineDetail:
      'ಯೋಜನೆಯ ಮಾಲೀಕರು ಈ ಅವಧಿಯನ್ನು ಪ್ರಕಟಿಸುತ್ತಾರೆ. ಇದನ್ನು ಕಾನೂನು ಎಂದಲ್ಲ, ಯೋಜನೆಯ ಸ್ವಂತ ನಿಯಮ ಎಂದು ಉಲ್ಲೇಖಿಸಿ.',
    rungStatutoryLabel: 'ಕಾನೂನಿನಿಂದ ರಚಿಸಲಾಗಿದೆ',
    rungStatutoryDetail:
      'ಕಾಯ್ದೆ ಅಥವಾ ಯೋಜನೆ ಮಾರ್ಗಸೂಚಿಗಳು ಈ ಕಚೇರಿಯನ್ನು ಸರಪಳಿಯಲ್ಲಿ ಇಡುತ್ತವೆ.',
    rungOfficialLabel: 'ಯೋಜನೆ ಮಾಲೀಕರಿಂದ ಪ್ರಕಟಿತ',
    rungOfficialDetail:
      'ಸಚಿವಾಲಯ ಅಥವಾ ಯೋಜನೆ ಪೋರ್ಟಲ್ ಈ ಕಚೇರಿ ಅಥವಾ ಕಿಟಕಿಯನ್ನು ಹೆಸರಿಸುತ್ತದೆ.',
    rungVariesLabel: 'ಹುದ್ದೆಯ ಹೆಸರು ರಾಜ್ಯಕ್ಕೆ ಬದಲಾಗುತ್ತದೆ',
    rungVariesDetail:
      'ಕಚೇರಿ ಇದೆ, ಈ ಕೆಲಸ ಮಾಡುತ್ತದೆ; ಆದರೆ ರಾಜ್ಯಗಳು ಬೇರೆ ಹೆಸರಿನಿಂದ ಕರೆಯುತ್ತವೆ. ಕೆಲಸದ ಆಧಾರದಲ್ಲಿ ಹುದ್ದೆಯನ್ನು ಕೇಳಿ.',
    rungPortalLabel: 'ಆನ್‌ಲೈನ್ ಕಿಟಕಿ',
    rungPortalDetail: 'ಈ ಹಂತ ಕೌಂಟರ್‌ನಲ್ಲಿ ಅಲ್ಲ, ಪೋರ್ಟಲ್‌ನಲ್ಲಿ ಪೂರ್ಣಗೊಳ್ಳುತ್ತದೆ.',
    rungDecisionLabel: 'ಈ ಕಚೇರಿ ಏನು ನಿರ್ಧರಿಸುತ್ತದೆ',
    sheetDueLine: '{what}. ಪಾವತಿಸಬೇಕಾದ ದಿನಾಂಕ {due}',
    sheetLetterEnglish: 'ಇಂಗ್ಲಿಷ್',
    sheetLetterHindi: 'ಹಿಂದಿ',
    sheetCarryTagline: 'ಒಯ್ಯುವ ಹಾಳೆ',
    locatorNoLgd: 'LGD ಇಲ್ಲ',
    locatorSourceNote: '{source}, ಸ್ನ್ಯಾಪ್‌ಶಾಟ್ {date}.',
    locatorLoadError: '{place} ಲೋಡ್ ಆಗಲಿಲ್ಲ. ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.',
    locatorHierarchyNote:
      'ಕೋಡ್ ಕಾಲಮ್ ಈ ಬಿಲ್ಡ್‌ನ ಡೈರೆಕ್ಟರಿ ಕೀ. lgd_code ಕಾಲಮ್ ಅಧಿಕೃತ ಸ್ಥಳೀಯ ಆಡಳಿತ ಡೈರೆಕ್ಟರಿ (LGD) ಕೋಡ್; ಈ ಬಿಲ್ಡ್‌ನೊಂದಿಗೆ ಬರುವ ಡೈರೆಕ್ಟರಿ ಸ್ನ್ಯಾಪ್‌ಶಾಟ್‌ಗೆ ಹೆಸರಿನ ಮೂಲಕ ಸೇರಿಸಲಾಗಿದೆ. gp_code ಮತ್ತು gp_name ಕಾಲಮ್‌ಗಳು ಡೈರೆಕ್ಟರಿಯಲ್ಲಿ ದಾಖಲಾದ ಗ್ರಾಮ ಪಂಚಾಯತಿಯ ಹೆಸರನ್ನು ನೀಡುತ್ತವೆ. ಖಾಲಿ lgd_code ಎಂದರೆ ಹೆಸರು ಅಸ್ಪಷ್ಟವಾಗಿತ್ತು ಅಥವಾ ಇರಲಿಲ್ಲ; ಖಾಲಿ gp_code ಎಂದರೆ ಆ ಗ್ರಾಮಕ್ಕೆ ಡೈರೆಕ್ಟರಿಯಲ್ಲಿ ಪಂಚಾಯತಿ ದಾಖಲೆ ಇಲ್ಲ. ಎರಡನ್ನೂ ಊಹಿಸಿ ತುಂಬಿಲ್ಲ.',
    trapsNote:
      'ಹೆಸರಿನ ಬಲೆ ಎಂದರೆ ನಿಮಗೆ ಬೇಕಾದ ಯೋಜನೆ ಅಥವಾ ಕಚೇರಿಯಂತೆ ಕೇಳಿಸುವ ಹೆಸರು. ಕೆಳಗಿನ ನಮೂದುಗಳು ಹೆಸರನ್ನು ಕಚೇರಿಯಿಂದ ಬೇರ್ಪಡಿಸುತ್ತವೆ.',
    scriptSpecimenLabel: 'ಭಾರತೀಯ ಲಿಪಿಗಳಲ್ಲಿ ಸಂಪರ್ಕ',
    levelNational: 'ರಾಷ್ಟ್ರೀಯ',
  },
  ml: {
    verifyUndated: 'പരിശോധനാ തീയതി രേഖപ്പെടുത്തിയിട്ടില്ല. ഇതിൽ ആശ്രയിക്കുന്നതിന് മുമ്പ് സ്ഥിരീകരിക്കുക.',
    verifyStale: '{checked} ന് പരിശോധിച്ചു. {due} മുതൽ വീണ്ടും പരിശോധന കാലഹരണപ്പെട്ടു.',
    verifyDue: '{checked} ന് പരിശോധിച്ചു. {due} ന് വീണ്ടും പരിശോധന വേണം.',
    deadlineStatutoryLabel: 'നിയമം നിശ്ചയിച്ചത്',
    deadlineStatutoryDetail:
      'ഒരു നിയമമോ അതിന് കീഴിലുള്ള ചട്ടമോ ഈ കാലയളവ് നിശ്ചയിക്കുന്നു. ഇത് പരാതിയിൽ ഉദ്ധരിക്കാം.',
    deadlineGuidelineLabel: 'പ്രസിദ്ധീകരിച്ച മാർഗ്ഗനിർദ്ദേശം',
    deadlineGuidelineDetail:
      'പദ്ധതി ഉടമ ഈ കാലയളവ് പ്രസിദ്ധീകരിക്കുന്നു. ഇത് നിയമമായല്ല, പദ്ധതിയുടെ സ്വന്തം ചട്ടമായി ഉദ്ധരിക്കുക.',
    rungStatutoryLabel: 'നിയമം സൃഷ്ടിച്ചത്',
    rungStatutoryDetail:
      'ഒരു നിയമമോ പദ്ധതി മാർഗ്ഗനിർദ്ദേശങ്ങളോ ഈ ഓഫീസിനെ ശൃംഖലയിൽ ഉൾപ്പെടുത്തുന്നു.',
    rungOfficialLabel: 'പദ്ധതി ഉടമ പ്രസിദ്ധീകരിച്ചത്',
    rungOfficialDetail:
      'മന്ത്രാലയമോ പദ്ധതി പോർട്ടലോ ഈ ഓഫീസിനെയോ വിൻഡോയെയോ പേരിടുന്നു.',
    rungVariesLabel: 'തസ്തികയുടെ പേര് സംസ്ഥാനത്തിനനുസരിച്ച് മാറും',
    rungVariesDetail:
      'ഓഫീസ് ഉണ്ട്, ഈ ജോലി ചെയ്യുന്നു; പക്ഷേ സംസ്ഥാനങ്ങൾ വേറെ പേരിൽ വിളിക്കുന്നു. ജോലിയുടെ അടിസ്ഥാനത്തിൽ തസ്തിക ചോദിക്കുക.',
    rungPortalLabel: 'ഓൺലൈൻ വിൻഡോ',
    rungPortalDetail: 'ഈ ഘട്ടം കൗണ്ടറിൽ അല്ല, പോർട്ടലിൽ പൂർത്തിയാകുന്നു.',
    rungDecisionLabel: 'ഈ ഓഫീസ് എന്താണ് തീരുമാനിക്കുന്നത്',
    sheetDueLine: '{what}. അടയ്ക്കേണ്ട തീയതി {due}',
    sheetLetterEnglish: 'ഇംഗ്ലീഷ്',
    sheetLetterHindi: 'ഹിന്ദി',
    sheetCarryTagline: 'കൊണ്ടുപോകാനുള്ള ഷീറ്റ്',
    locatorNoLgd: 'LGD ഇല്ല',
    locatorSourceNote: '{source}, സ്നാപ്പ്ഷോട്ട് {date}.',
    locatorLoadError: '{place} ലോഡ് ചെയ്യാനായില്ല. വീണ്ടും ശ്രമിക്കുക.',
    locatorHierarchyNote:
      'കോഡ് നിര ഈ ബിൽഡിന്റെ ഡയറക്ടറി കീയാണ്. lgd_code നിര ഔദ്യോഗിക തദ്ദേശഭരണ ഡയറക്ടറി (LGD) കോഡാണ്; ഈ ബിൽഡിനൊപ്പം വരുന്ന ഡയറക്ടറി സ്നാപ്പ്ഷോട്ടുമായി പേര് ചേർത്താണ് ഇത് ബന്ധിപ്പിച്ചത്. gp_code, gp_name നിരകൾ ഡയറക്ടറിയിൽ രേഖയുള്ള ഗ്രാമപഞ്ചായത്തിന്റെ പേര് നൽകുന്നു. ശൂന്യമായ lgd_code അർത്ഥം പേര് അവ്യക്തമായിരുന്നു അല്ലെങ്കിൽ ഇല്ലായിരുന്നു; ശൂന്യമായ gp_code അർത്ഥം ആ ഗ്രാമത്തിന് ഡയറക്ടറിയിൽ പഞ്ചായത്ത് രേഖയില്ല. രണ്ടും ഊഹിച്ച് നിറച്ചിട്ടില്ല.',
    trapsNote:
      'പേരുകെണി എന്നത് നിങ്ങൾക്ക് വേണ്ട പദ്ധതിയോ ഓഫീസോ പോലെ കേൾക്കുന്ന പേരാണ്. താഴെയുള്ള എൻട്രികൾ പേരിനെ ഓഫീസിൽ നിന്ന് വേർതിരിക്കുന്നു.',
    scriptSpecimenLabel: 'ഇന്ത്യൻ ലിപികളിൽ സമ്പർക്കം',
    levelNational: 'ദേശീയ',
  },
  ur: {
    verifyUndated: 'جانچ کی تاریخ درج نہیں۔ اس پر بھروسہ کرنے سے پہلے تصدیق کریں۔',
    verifyStale: '{checked} کو جانچا گیا۔ {due} سے دوبارہ جانچ باقی ہے۔',
    verifyDue: '{checked} کو جانچا گیا۔ {due} کو دوبارہ جانچ لازم ہے۔',
    deadlineStatutoryLabel: 'قانون سے مقرر',
    deadlineStatutoryDetail:
      'کوئی ایکٹ یا اس کے تحت بنایا گیا قاعدہ یہ مدت مقرر کرتا ہے۔ اسے شکایت میں نقل کیا جا سکتا ہے۔',
    deadlineGuidelineLabel: 'شائع شدہ رہنما ہدایت',
    deadlineGuidelineDetail:
      'اسکیم کا مالک یہ مدت شائع کرتا ہے۔ اسے قانون کے طور پر نہیں، اسکیم کے اپنے قاعدے کے طور پر نقل کریں۔',
    rungStatutoryLabel: 'قانون سے قائم',
    rungStatutoryDetail:
      'کوئی ایکٹ یا اسکیم کی ہدایات اس دفتر کو سلسلے میں رکھتی ہیں۔',
    rungOfficialLabel: 'اسکیم مالک کی جانب سے شائع',
    rungOfficialDetail:
      'وزارت یا اسکیم پورٹل اس دفتر یا ونڈو کا نام دیتا ہے۔',
    rungVariesLabel: 'عہدے کا نام ریاست کے مطابق بدلتا ہے',
    rungVariesDetail:
      'دفتر موجود ہے اور یہ کام کرتا ہے، مگر ریاستیں اسے مختلف نام سے بلاتی ہیں۔ عہدہ اس کے کام سے پوچھیں۔',
    rungPortalLabel: 'آن لائن ونڈو',
    rungPortalDetail: 'یہ مرحلہ کاؤنٹر پر نہیں، پورٹل پر مکمل ہوتا ہے۔',
    rungDecisionLabel: 'یہ دفتر کیا فیصلہ کرتا ہے',
    sheetDueLine: '{what}۔ واجب الادا تاریخ {due}',
    sheetLetterEnglish: 'انگریزی',
    sheetLetterHindi: 'ہندی',
    sheetCarryTagline: 'ساتھ لے جانے والی شیٹ',
    locatorNoLgd: 'LGD نہیں',
    locatorSourceNote: '{source}، اسنیپ شاٹ {date}۔',
    locatorLoadError: '{place} لوڈ نہیں ہو سکا۔ دوبارہ کوشش کریں۔',
    locatorHierarchyNote:
      'کوڈ کالم اس بلڈ کے لیے ڈائریکٹری کی ہے۔ lgd_code کالم سرکاری مقامی حکومت ڈائریکٹری (LGD) کوڈ ہے، جو اس بلڈ کے ساتھ بھیجے گئے ڈائریکٹری اسنیپ شاٹ سے نام ملا کر جوڑا گیا ہے۔ gp_code اور gp_name کالم اس گرام پنچایت کا نام دیتے ہیں جہاں ڈائریکٹری میں اندراج ہے۔ خالی lgd_code کا مطلب ہے نام مبہم یا غائب تھا؛ خالی gp_code کا مطلب ہے اس گاؤں کے لیے ڈائریکٹری میں کوئی پنچایت درج نہیں۔ دونوں میں سے کچھ بھی اندازے سے نہیں بھرا گیا۔',
    trapsNote:
      'نام کا جال ایسا نام ہے جو آپ کی مطلوبہ اسکیم یا دفتر جیسا سنائی دے۔ نیچے کی اندراجات نام کو دفتر سے الگ کرتی ہیں۔',
    scriptSpecimenLabel: 'بھارتی رسم الخط میں رابطہ',
    levelNational: 'قومی',
  },
};
