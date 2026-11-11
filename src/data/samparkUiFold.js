// The labels on the click-to-open result blocks.
//
// Sampark is read by people who may be tired, frightened or helping someone
// else. A long result is therefore a tab, not a wall: the tab says what is
// inside and how many items it holds. The count is part of the promise; a
// closed tab must not imply that the page is empty.
//
// These are page chrome, not corpus. Office names, scheme names, sources and
// the legal letter stay in their source form. Every locale carries the same
// placeholders, and copyFor() never fills a missing key from English.

export const SAMPARK_UI_FOLD = {
  en: {
    foldSituationHint:
      'Open for {n} situations. Start with what happened, not the scheme name.',
    foldSchemeHint: 'Open for {schemes} schemes and {routes} ways to reach the office.',
    foldDocumentsHint: 'Open for {n} documents, including the envelope checklist.',
    foldOfficeHint: 'Open for {offices} offices and {deadlines} deadlines.',
    foldSheetHint: 'Open for the letter and the ladder’s {n} offices.',
    foldHelpHint: 'Open for the case note and {n} ways to send it.',
    foldTrapsHint: 'Open for {n} names that mislead.',
    foldDeliveryHint:
      'Open for {n} policy maps, their evidence and escalation routes.',
    locatorBrowseCount: '{n} names. Search without the map.',
  },
  hi: {
    foldSituationHint:
      'यहाँ {n} स्थितियाँ हैं। योजना का नाम नहीं, जो हुआ वह चुनें।',
    foldSchemeHint: 'यहाँ {schemes} योजनाएँ और कार्यालय तक पहुँचने के {routes} रास्ते हैं।',
    foldDocumentsHint: 'यहाँ {n} दस्तावेज़ हैं, जिनमें लिफ़ाफ़े की सूची भी है।',
    foldOfficeHint: 'यहाँ {offices} कार्यालय और {deadlines} समय-सीमाएँ हैं।',
    foldSheetHint: 'यहाँ पत्र और सीढ़ी के {n} कार्यालय हैं।',
    foldHelpHint: 'यहाँ केस नोट और भेजने के {n} तरीके हैं।',
    foldTrapsHint: 'यहाँ {n} भ्रम पैदा करने वाले नाम हैं।',
    foldDeliveryHint:
      'यहाँ {n} नीति-नक्शे, उनके साक्ष्य और शिकायत के रास्ते हैं।',
    locatorBrowseCount: 'यहाँ {n} नाम हैं। नक्शे के बिना खोजें।',
  },
  bn: {
    foldSituationHint:
      'এখানে {n} পরিস্থিতি আছে। প্রকল্পের নাম নয়, কী ঘটেছে সেটি বেছে নিন।',
    foldSchemeHint: 'এখানে {schemes} প্রকল্প এবং দপ্তরে পৌঁছানোর {routes} উপায় আছে।',
    foldDocumentsHint: 'এখানে {n} নথি আছে, সঙ্গে খামের তালিকাও।',
    foldOfficeHint: 'এখানে {offices} দপ্তর এবং {deadlines} সময়সীমা আছে।',
    foldSheetHint: 'এখানে চিঠি এবং সিঁড়ির {n} দপ্তর আছে।',
    foldHelpHint: 'এখানে কেস নোট এবং পাঠানোর {n} উপায় আছে।',
    foldTrapsHint: 'এখানে {n} বিভ্রান্তিকর নাম আছে।',
    foldDeliveryHint:
      'এখানে {n} নীতি-মানচিত্র, তাদের প্রমাণ এবং অভিযোগের পথ আছে।',
    locatorBrowseCount: 'এখানে {n} নাম আছে। মানচিত্র ছাড়াই খুঁজুন।',
  },
  gu: {
    foldSituationHint:
      'અહીં {n} પરિસ્થિતિઓ છે. યોજનાનું નામ નહીં, જે થયું તે પસંદ કરો.',
    foldSchemeHint: 'અહીં {schemes} યોજનાઓ અને કચેરી સુધી પહોંચવાના {routes} રસ્તા છે.',
    foldDocumentsHint: 'અહીં {n} દસ્તાવેજો છે, જેમાં લિફાફાની યાદી પણ છે.',
    foldOfficeHint: 'અહીં {offices} કચેરીઓ અને {deadlines} સમયમર્યાદાઓ છે.',
    foldSheetHint: 'અહીં પત્ર અને સીડીની {n} કચેરીઓ છે.',
    foldHelpHint: 'અહીં કેસ નોંધ અને મોકલવાની {n} રીતો છે.',
    foldTrapsHint: 'અહીં {n} ભ્રમ પેદા કરતાં નામો છે.',
    foldDeliveryHint:
      'અહીં {n} નીતિ-નકશા, તેમના પુરાવા અને ફરિયાદના રસ્તા છે.',
    locatorBrowseCount: 'અહીં {n} નામો છે. નકશા વિના શોધો.',
  },
  ta: {
    foldSituationHint:
      'இங்கே {n} சூழல்கள் உள்ளன. திட்டத்தின் பெயர் அல்ல, என்ன நடந்தது என்பதைத் தேர்ந்தெடுங்கள்.',
    foldSchemeHint: 'இங்கே {schemes} திட்டங்களும் அலுவலகத்தை அடைய {routes} வழிகளும் உள்ளன.',
    foldDocumentsHint: 'இங்கே {n} ஆவணங்கள் உள்ளன; உறையின் பட்டியலும் அடங்கும்.',
    foldOfficeHint: 'இங்கே {offices} அலுவலகங்களும் {deadlines} காலக்கெடுகளும் உள்ளன.',
    foldSheetHint: 'இங்கே கடிதமும் ஏணியின் {n} அலுவலகங்களும் உள்ளன.',
    foldHelpHint: 'இங்கே வழக்குக் குறிப்பும் அனுப்ப {n} வழிகளும் உள்ளன.',
    foldTrapsHint: 'இங்கே {n} தவறாக வழிநடத்தும் பெயர்கள் உள்ளன.',
    foldDeliveryHint:
      'இங்கே {n} கொள்கை வரைபடங்கள், அவற்றின் சான்றுகள் மற்றும் புகார் வழிகள் உள்ளன.',
    locatorBrowseCount: 'இங்கே {n} பெயர்கள் உள்ளன. வரைபடம் இல்லாமல் தேடுங்கள்.',
  },
  te: {
    foldSituationHint:
      'ఇక్కడ {n} పరిస్థితులు ఉన్నాయి. పథకం పేరు కాదు, ఏం జరిగిందో ఎంచుకోండి.',
    foldSchemeHint: 'ఇక్కడ {schemes} పథకాలు మరియు కార్యాలయానికి చేరే {routes} మార్గాలు ఉన్నాయి.',
    foldDocumentsHint: 'ఇక్కడ {n} పత్రాలు ఉన్నాయి; కవరు జాబితా కూడా ఉంది.',
    foldOfficeHint: 'ఇక్కడ {offices} కార్యాలయాలు మరియు {deadlines} గడువులు ఉన్నాయి.',
    foldSheetHint: 'ఇక్కడ ఉత్తరం మరియు నిచ్చెనలోని {n} కార్యాలయాలు ఉన్నాయి.',
    foldHelpHint: 'ఇక్కడ కేసు నోటు మరియు పంపే {n} మార్గాలు ఉన్నాయి.',
    foldTrapsHint: 'ఇక్కడ {n} అపార్థం కలిగించే పేర్లు ఉన్నాయి.',
    foldDeliveryHint:
      'ఇక్కడ {n} విధాన మ్యాప్‌లు, వాటి ఆధారాలు మరియు ఫిర్యాదు మార్గాలు ఉన్నాయి.',
    locatorBrowseCount: 'ఇక్కడ {n} పేర్లు ఉన్నాయి. మ్యాప్ లేకుండా వెతకండి.',
  },
  kn: {
    foldSituationHint:
      'ಇಲ್ಲಿ {n} ಸಂದರ್ಭಗಳಿವೆ. ಯೋಜನೆಯ ಹೆಸರಲ್ಲ, ಏನಾಯಿತು ಎಂಬುದನ್ನು ಆಯ್ಕೆಮಾಡಿ.',
    foldSchemeHint: 'ಇಲ್ಲಿ {schemes} ಯೋಜನೆಗಳು ಮತ್ತು ಕಚೇರಿಗೆ ತಲುಪುವ {routes} ಮಾರ್ಗಗಳಿವೆ.',
    foldDocumentsHint: 'ಇಲ್ಲಿ {n} ದಾಖಲೆಗಳಿವೆ; ಲಕೋಟೆ ಪಟ್ಟಿಯೂ ಸೇರಿದೆ.',
    foldOfficeHint: 'ಇಲ್ಲಿ {offices} ಕಚೇರಿಗಳು ಮತ್ತು {deadlines} ಗಡುವುಗಳಿವೆ.',
    foldSheetHint: 'ಇಲ್ಲಿ ಪತ್ರ ಮತ್ತು ಏಣಿಯ {n} ಕಚೇರಿಗಳಿವೆ.',
    foldHelpHint: 'ಇಲ್ಲಿ ಪ್ರಕರಣ ಟಿಪ್ಪಣಿ ಮತ್ತು ಕಳುಹಿಸುವ {n} ಮಾರ್ಗಗಳಿವೆ.',
    foldTrapsHint: 'ಇಲ್ಲಿ {n} ದಾರಿತಪ್ಪಿಸುವ ಹೆಸರುಗಳಿವೆ.',
    foldDeliveryHint:
      'ಇಲ್ಲಿ {n} ನೀತಿ ನಕ್ಷೆಗಳು, ಅವುಗಳ ಸಾಕ್ಷ್ಯ ಮತ್ತು ದೂರು ಮಾರ್ಗಗಳಿವೆ.',
    locatorBrowseCount: 'ಇಲ್ಲಿ {n} ಹೆಸರುಗಳಿವೆ. ನಕ್ಷೆ ಇಲ್ಲದೆ ಹುಡುಕಿ.',
  },
  ml: {
    foldSituationHint:
      'ഇവിടെ {n} സാഹചര്യങ്ങളുണ്ട്. പദ്ധതിയുടെ പേരല്ല, എന്താണ് സംഭവിച്ചതെന്ന് തിരഞ്ഞെടുക്കുക.',
    foldSchemeHint: 'ഇവിടെ {schemes} പദ്ധതികളും ഓഫീസിലെത്താനുള്ള {routes} വഴികളുമുണ്ട്.',
    foldDocumentsHint: 'ഇവിടെ {n} രേഖകളുണ്ട്; കവറിലെ പട്ടികയും ഉൾപ്പെടുന്നു.',
    foldOfficeHint: 'ഇവിടെ {offices} ഓഫീസുകളും {deadlines} സമയപരിധികളുമുണ്ട്.',
    foldSheetHint: 'ഇവിടെ കത്തും ഗോവണിയിലെ {n} ഓഫീസുകളുമുണ്ട്.',
    foldHelpHint: 'ഇവിടെ കേസ് കുറിപ്പും അയയ്ക്കാനുള്ള {n} വഴികളുമുണ്ട്.',
    foldTrapsHint: 'ഇവിടെ {n} തെറ്റായി വഴിതിരിച്ചുവിടുന്ന പേരുകളുണ്ട്.',
    foldDeliveryHint:
      'ഇവിടെ {n} നയ മാപ്പുകളും അവയുടെ തെളിവുകളും പരാതി വഴികളുമുണ്ട്.',
    locatorBrowseCount: 'ഇവിടെ {n} പേരുകളുണ്ട്. മാപ്പ് ഇല്ലാതെ തിരയുക.',
  },
  ur: {
    foldSituationHint:
      'یہاں {n} صورتحال ہیں۔ اسکیم کا نام نہیں، جو ہوا وہ چنیں۔',
    foldSchemeHint: 'یہاں {schemes} اسکیمیں اور دفتر تک پہنچنے کے {routes} راستے ہیں۔',
    foldDocumentsHint: 'یہاں {n} دستاویزات ہیں، جن میں لفافے کی فہرست بھی ہے۔',
    foldOfficeHint: 'یہاں {offices} دفتر اور {deadlines} مقررہ مدتیں ہیں۔',
    foldSheetHint: 'یہاں خط اور سیڑھی کے {n} دفتر ہیں۔',
    foldHelpHint: 'یہاں کیس نوٹ اور بھیجنے کے {n} طریقے ہیں۔',
    foldTrapsHint: 'یہاں {n} گمراہ کرنے والے نام ہیں۔',
    foldDeliveryHint:
      'یہاں {n} پالیسی نقشے، ان کے ثبوت اور شکایت کے راستے ہیں۔',
    locatorBrowseCount: 'یہاں {n} نام ہیں۔ نقشے کے بغیر تلاش کریں۔',
  },
};
