import { SAMPARK_UI } from './samparkUiCopy.js';
import { SAMPARK_UI_EXTRA } from './samparkUiExtra.js';
import { SAMPARK_UI_GUIDE } from './samparkUiGuide.js';
import { SAMPARK_UI_FOLD } from './samparkUiFold.js';

// Sampark in nine languages.
//
// This translates the page's structure: the steps, the prompts, the consent
// line and the buttons. It does not translate the corpus. Scheme names,
// office names, sources, deadlines and the letter stay in English (the letter
// is separately available in Hindi where its text has been reviewed), because
// an unreviewed translation of a legal citation is worse than the original.
//
// None of these translations has been reviewed by a native speaker yet. The
// page says so where the language is chosen. Treat them as drafted labels,
// not as a substitute for the English page.

export const SAMPARK_LOCALES = [
  { code: 'en', label: 'English', endonym: 'English' },
  { code: 'hi', label: 'Hindi', endonym: 'हिन्दी' },
  { code: 'bn', label: 'Bengali', endonym: 'বাংলা' },
  { code: 'gu', label: 'Gujarati', endonym: 'ગુજરાતી' },
  { code: 'ta', label: 'Tamil', endonym: 'தமிழ்' },
  { code: 'te', label: 'Telugu', endonym: 'తెలుగు' },
  { code: 'kn', label: 'Kannada', endonym: 'ಕನ್ನಡ' },
  { code: 'ml', label: 'Malayalam', endonym: 'മലയാളം' },
  { code: 'ur', label: 'Urdu', endonym: 'اردو', rtl: true },
];

const EN = {
  eyebrow: 'Touchpoint maps',
  question: 'Which office owes you the answer?',
  intro:
    'Where you are, what happened, who decides, how to reach them, what to carry, and the sheet to hand over. At the end you can ask THS to take the case up for you.',
  step1: 'Where are you?',
  step2: 'What happened?',
  step3: 'Who decides?',
  step4: 'How to reach them',
  step5: 'Documents to carry',
  step6: 'The sheet to carry',
  step7: 'Ask THS to take it up',
  chooseScheme:
    'Pick the scheme, or use the situation above. The ladder starts at the office for your level and climbs to the ministry.',
  ladder: 'The ladder, from your level up',
  situationLead:
    'Every situation in the tool, across all {n} schemes. Words like wages, tap water, hospital or instalment are enough.',
  situationPlaceholder: 'Wages, water, hospital, instalment',
  situationNone: 'No situation matches that. Try the problem in your own words, or pick the scheme below.',
  situationCount: '{shown} of {total} situations',
  contactDirectory: 'Phone helplines and state grievance officers are in the delivery maps below.',
  documentsLead:
    'For the {office}, {post}. This is the list recorded for that office in the ladder, not a checklist the office has agreed to.',
  documentsEnvelope: 'Put in the envelope',
  documentsNoPlace: 'Pick a place above, and the documents recorded for your office appear here.',
  documentsCaveat:
    'If the office asks for a document that is not on this list, ask for the requirement in writing and keep that paper with the rest.',
  csoConsent:
    'I authorise THS to take up this case on my behalf, including writing to the office about it. Without this, the note asks for advice only.',
  csoEmail: 'Email this case to THS',
  csoCopy: 'Copy the case note',
  csoDownload: 'Download the note',
  documentsSource: 'Source:',
  documentsEnclosure1: 'A copy of your application, or the record of it that you have',
  documentsEnclosure2: 'Any letter, receipt or intimation the office has sent you',
  documentsEnclosure3: 'Two copies of the sheet below, so one can be stamped',
  csoName: 'Your name (optional)',
  csoMobile: 'Mobile number (optional)',
  csoReference:
    'Reference: {ref}. Quote it if you call or write again. If your mail app cuts the note short, download it and attach the file instead.',
  languageLabel: 'Page language',
  note: 'Labels are translated. Scheme names, office details, sources and the letter stay in English.',
};

export const SAMPARK_COPY = {
  en: EN,
  hi: {
    eyebrow: 'टचपॉइंट नक्शे',
    question: 'जवाब किस कार्यालय का देना है?',
    intro:
      'आप कहाँ हैं, क्या हुआ, कौन तय करता है, उन तक कैसे पहुँचें, क्या साथ ले जाएँ, और सौंपने वाली शीट। अंत में आप THS से कह सकते हैं कि वह मामला उठाए।',
    step1: 'आप कहाँ हैं?',
    step2: 'क्या हुआ?',
    step3: 'कौन तय करता है?',
    step4: 'उन तक कैसे पहुँचें',
    step5: 'साथ ले जाने वाले दस्तावेज़',
    step6: 'साथ ले जाने वाली शीट',
    step7: 'THS से कहें कि वह इसे उठाए',
    chooseScheme:
      'योजना चुनें, या ऊपर दी गई स्थिति का उपयोग करें। सीढ़ी आपके स्तर के कार्यालय से शुरू होकर मंत्रालय तक जाती है।',
    ladder: 'सीढ़ी, आपके स्तर से ऊपर',
    situationLead:
      'उपकरण की हर स्थिति, सभी {n} योजनाओं में। मज़दूरी, नल का पानी, अस्पताल या किस्त जैसे शब्द काफ़ी हैं।',
    situationPlaceholder: 'मज़दूरी, पानी, अस्पताल, किस्त',
    situationNone:
      'इससे मिलती कोई स्थिति नहीं है। समस्या अपने शब्दों में लिखें, या नीचे योजना चुनें।',
    contactDirectory: 'फ़ोन हेल्पलाइन और राज्य के शिकायत अधिकारी नीचे दिए गए डिलीवरी नक्शों में हैं।',
    documentsLead:
      '{office}, {post} के लिए। यह सीढ़ी में उस कार्यालय के लिए दर्ज सूची है, कार्यालय द्वारा सहमत चेकलिस्ट नहीं।',
    documentsEnvelope: 'लिफ़ाफ़े में रखें',
    documentsNoPlace: 'ऊपर जगह चुनें, और आपके कार्यालय के लिए दर्ज दस्तावेज़ यहाँ दिखेंगे।',
    documentsCaveat:
      'अगर कार्यालय इस सूची में न हो ऐसा दस्तावेज़ माँगे, तो माँग लिखित में माँगें और वह काग़ज़ बाक़ी के साथ रखें।',
    csoConsent:
      'मैं THS को अधिकृत करता/करती हूँ कि वह मेरी ओर से यह मामला उठाए, जिसमें कार्यालय को लिखना भी शामिल है। इसके बिना नोट सिर्फ़ सलाह माँगेगा।',
    csoEmail: 'यह मामला THS को ईमेल करें',
    csoCopy: 'केस नोट कॉपी करें',
    csoDownload: 'नोट डाउनलोड करें',
    situationCount: '{total} में से {shown} स्थितियाँ',
    documentsSource: 'स्रोत:',
    documentsEnclosure1: 'आपके आवेदन की एक प्रति, या उसका जो रिकॉर्ड आपके पास है',
    documentsEnclosure2: 'कार्यालय ने आपको जो भी पत्र, रसीद या सूचना भेजी हो',
    documentsEnclosure3: 'नीचे दी गई शीट की दो प्रतियाँ, ताकि एक पर मुहर लग सके',
    csoName: 'आपका नाम (वैकल्पिक)',
    csoMobile: 'मोबाइल नंबर (वैकल्पिक)',
    csoReference:
      'संदर्भ: {ref}। अगर आप फिर कॉल या लिखें तो यह बताएँ। अगर मेल ऐप नोट काट दे, तो उसे डाउनलोड करके फ़ाइल अटैच करें।',
    languageLabel: 'पेज की भाषा',
    note: 'लेबलों का अनुवाद किया गया है। योजना, कार्यालय, स्रोत और पत्र अंग्रेज़ी में हैं।',
  },
  bn: {
    eyebrow: 'টাচপয়েন্ট মানচিত্র',
    question: 'উত্তর কোন দপ্তর দেবে?',
    intro:
      'আপনি কোথায়, কী ঘটেছে, কে সিদ্ধান্ত নেয়, তাদের কাছে কীভাবে পৌঁছাবেন, কী সঙ্গে নেবেন, এবং জমা দেওয়ার শিট। শেষে আপনি THS-কে মামলাটি তুলে নিতে বলতে পারেন।',
    step1: 'আপনি কোথায়?',
    step2: 'কী ঘটেছে?',
    step3: 'কে সিদ্ধান্ত নেয়?',
    step4: 'তাদের কাছে কীভাবে পৌঁছাবেন',
    step5: 'সঙ্গে নেওয়ার নথি',
    step6: 'সঙ্গে নেওয়ার শিট',
    step7: 'THS-কে এটি তুলে নিতে বলুন',
    chooseScheme:
      'স্কিম বেছে নিন, বা উপরের পরিস্থিতি ব্যবহার করুন। সিঁড়িটি আপনার স্তরের দপ্তর থেকে শুরু হয়ে মন্ত্রক পর্যন্ত যায়।',
    ladder: 'সিঁড়ি, আপনার স্তর থেকে উপরে',
    situationLead:
      'টুলের প্রতিটি পরিস্থিতি, সব {n}টি স্কিমে। মজুরি, কলের জল, হাসপাতাল বা কিস্তির মতো শব্দই যথেষ্ট।',
    situationPlaceholder: 'মজুরি, জল, হাসপাতাল, কিস্তি',
    situationNone: 'এর সঙ্গে মেলে এমন পরিস্থিতি নেই। সমস্যাটি নিজের ভাষায় লিখুন, বা নিচে স্কিম বেছে নিন।',
    contactDirectory: 'ফোন হেল্পলাইন ও রাজ্যের অভিযোগ আধিকারিক নিচের ডেলিভারি মানচিত্রে আছে।',
    documentsLead:
      '{office}, {post}-এর জন্য। এটি সিঁড়িতে ওই দপ্তরের জন্য লিপিবদ্ধ তালিকা, দপ্তরের সম্মত চেকলিস্ট নয়।',
    documentsEnvelope: 'খামে রাখুন',
    documentsNoPlace: 'উপরে একটি জায়গা বেছে নিন, আপনার দপ্তরের নথি এখানে দেখাবে।',
    documentsCaveat:
      'দপ্তর এই তালিকার বাইরে নথি চাইলে লিখিতভাবে চাইতে বলুন এবং সেই কাগজ বাকিগুলির সঙ্গে রাখুন।',
    csoConsent:
      'আমি THS-কে অনুমতি দিচ্ছি যে তারা আমার হয়ে এই মামলাটি তুলবে, দপ্তরকে লেখাও এর মধ্যে আছে। এটি না দিলে নোটটি শুধু পরামর্শ চাইবে।',
    csoEmail: 'এই মামলা THS-কে ইমেল করুন',
    csoCopy: 'কেস নোট কপি করুন',
    csoDownload: 'নোট ডাউনলোড করুন',
    situationCount: '{total}টির মধ্যে {shown}টি পরিস্থিতি',
    documentsSource: 'সূত্র:',
    documentsEnclosure1: 'আপনার আবেদনের একটি কপি, বা আপনার কাছে থাকা তার রেকর্ড',
    documentsEnclosure2: 'দপ্তর আপনাকে যে চিঠি, রসিদ বা জানানো বার্তা পাঠিয়েছে',
    documentsEnclosure3: 'নিচের শিটের দুটি কপি, যাতে একটিতে সিল দেওয়া যায়',
    csoName: 'আপনার নাম (ঐচ্ছিক)',
    csoMobile: 'মোবাইল নম্বর (ঐচ্ছিক)',
    csoReference:
      'রেফারেন্স: {ref}। আবার ফোন বা লেখা করলে এটি বলুন। মেল অ্যাপ নোটটি কেটে দিলে ডাউনলোড করে ফাইলটি সংযুক্ত করুন।',
    languageLabel: 'পৃষ্ঠার ভাষা',
    note: 'লেবেল অনুবাদ করা হয়েছে। স্কিম, দপ্তর, সূত্র ও চিঠি ইংরেজিতে আছে।',
  },
  gu: {
    eyebrow: 'ટચપોઈન્ટ નકશા',
    question: 'જવાબ કયું કચેરી આપશે?',
    intro:
      'તમે ક્યાં છો, શું થયું, કોણ નક્કી કરે છે, તેમના સુધી કેવી રીતે પહોંચવું, શું સાથે લેવું, અને સોંપવાની શીટ. અંતે તમે THS ને કેસ ઉપાડવા કહી શકો છો.',
    step1: 'તમે ક્યાં છો?',
    step2: 'શું થયું?',
    step3: 'કોણ નક્કી કરે છે?',
    step4: 'તેમના સુધી કેવી રીતે પહોંચવું',
    step5: 'સાથે લઈ જવાના દસ્તાવેજો',
    step6: 'સાથે લઈ જવાની શીટ',
    step7: 'THS ને કહો કે તે આ કેસ લે',
    chooseScheme:
      'યોજના પસંદ કરો, અથવા ઉપરની સ્થિતિ વાપરો. સીડી તમારા સ્તરની કચેરીથી શરૂ થઈને મંત્રાલય સુધી જાય છે.',
    ladder: 'સીડી, તમારા સ્તરથી ઉપર',
    situationLead:
      'ટૂલની દરેક સ્થિતિ, બધી {n} યોજનાઓમાં. મજૂરી, નળનું પાણી, હોસ્પિટલ કે હપ્તો જેવા શબ્દો પૂરતા છે.',
    situationPlaceholder: 'મજૂરી, પાણી, હોસ્પિટલ, હપ્તો',
    situationNone: 'આ સાથે મળતી કોઈ સ્થિતિ નથી. સમસ્યા તમારા શબ્દોમાં લખો, અથવા નીચે યોજના પસંદ કરો.',
    contactDirectory: 'ફોન હેલ્પલાઇન અને રાજ્યના ફરિયાદ અધિકારી નીચેના ડિલિવરી નકશામાં છે.',
    documentsLead:
      '{office}, {post} માટે. આ સીડીમાં તે કચેરી માટે નોંધેલી યાદી છે, કચેરીએ સ્વીકારેલી ચેકલિસ્ટ નહીં.',
    documentsEnvelope: 'લિફાફામાં મૂકો',
    documentsNoPlace: 'ઉપર જગ્યા પસંદ કરો, અને તમારી કચેરીના દસ્તાવેજો અહીં દેખાશે.',
    documentsCaveat:
      'કચેરી આ યાદીમાં ન હોય તેવો દસ્તાવેજ માંગે તો લખિતમાં માંગો અને તે કાગળ બાકીના સાથે રાખો.',
    csoConsent:
      'હું THS ને અધિકૃત કરું છું કે તે મારા વતી આ કેસ ઉપાડે, કચેરીને લખવું પણ તેમાં સમાવે. આ વિના નોંધ ફક્ત સલાહ માંગશે.',
    csoEmail: 'આ કેસ THS ને ઈમેલ કરો',
    csoCopy: 'કેસ નોંધ કૉપી કરો',
    csoDownload: 'નોંધ ડાઉનલોડ કરો',
    situationCount: '{total} માંથી {shown} સ્થિતિઓ',
    documentsSource: 'સ્રોત:',
    documentsEnclosure1: 'તમારી અરજીની એક નકલ, અથવા તેનો જે રેકોર્ડ તમારી પાસે છે',
    documentsEnclosure2: 'કચેરીએ તમને મોકલેલ કોઈપણ પત્ર, રસીદ કે સૂચના',
    documentsEnclosure3: 'નીચેની શીટની બે નકલો, જેથી એક પર સિક્કો લાગી શકે',
    csoName: 'તમારું નામ (વૈકલ્પિક)',
    csoMobile: 'મોબાઈલ નંબર (વૈકલ્પિક)',
    csoReference:
      'સંદર્ભ: {ref}. ફરી ફોન કે લખો તો આ જણાવો. મેલ એપ નોંધ કાપે તો તેને ડાઉનલોડ કરી ફાઈલ જોડો.',
    languageLabel: 'પૃષ્ઠની ભાષા',
    note: 'લેબલનો અનુવાદ થયો છે. યોજના, કચેરી, સ્રોત અને પત્ર અંગ્રેજીમાં છે.',
  },
  ta: {
    eyebrow: 'தொடர்பு புள்ளி வரைபடங்கள்',
    question: 'பதிலை எந்த அலுவலகம் தர வேண்டும்?',
    intro:
      'நீங்கள் எங்கே, என்ன நடந்தது, யார் முடிவு செய்கிறார், அவர்களை எப்படி அணுகுவது, என்ன எடுத்துச் செல்ல வேண்டும், ஒப்படைக்கும் தாள். இறுதியில் THS இதை எடுத்துக்கொள்ளச் சொல்லலாம்.',
    step1: 'நீங்கள் எங்கே?',
    step2: 'என்ன நடந்தது?',
    step3: 'யார் முடிவு செய்கிறார்?',
    step4: 'அவர்களை எப்படி அணுகுவது',
    step5: 'எடுத்துச் செல்ல வேண்டிய ஆவணங்கள்',
    step6: 'எடுத்துச் செல்ல வேண்டிய தாள்',
    step7: 'THS இதை எடுத்துக்கொள்ளச் சொல்லுங்கள்',
    chooseScheme:
      'திட்டத்தைத் தேர்ந்தெடுக்கவும், அல்லது மேலே உள்ள நிலையைப் பயன்படுத்தவும். ஏணி உங்கள் நிலை அலுவலகத்திலிருந்து அமைச்சகம் வரை செல்கிறது.',
    ladder: 'ஏணி, உங்கள் நிலையிலிருந்து மேலே',
    situationLead:
      'கருவியின் ஒவ்வொரு நிலையும், அனைத்து {n} திட்டங்களிலும். கூலி, குழாய் நீர், மருத்துவமனை அல்லது தவணை போன்ற சொற்கள் போதும்.',
    situationPlaceholder: 'கூலி, நீர், மருத்துவமனை, தவணை',
    situationNone:
      'இதற்குப் பொருந்தும் நிலை இல்லை. பிரச்சினையை உங்கள் சொற்களில் எழுதுங்கள், அல்லது கீழே திட்டத்தைத் தேர்ந்தெடுங்கள்.',
    contactDirectory: 'தொலைபேசி உதவி எண்களும் மாநிலப் புகார் அதிகாரிகளும் கீழே உள்ள வழங்கல் வரைபடங்களில் உள்ளனர்.',
    documentsLead:
      '{office}, {post} க்காக. இது ஏணியில் அந்த அலுவலகத்திற்குப் பதிவு செய்யப்பட்ட பட்டியல்; அலுவலகம் ஏற்றுக்கொண்ட சரிபார்ப்புப் பட்டியல் அல்ல.',
    documentsEnvelope: 'உறையில் வைக்கவும்',
    documentsNoPlace: 'மேலே ஒரு இடத்தைத் தேர்ந்தெடுங்கள்; உங்கள் அலுவலகத்திற்கான ஆவணங்கள் இங்கே தோன்றும்.',
    documentsCaveat:
      'இந்தப் பட்டியலில் இல்லாத ஆவணத்தை அலுவலகம் கேட்டால், அதை எழுத்தில் கேளுங்கள்; அந்தக் காகிதத்தை மற்றவற்றுடன் வைத்திருங்கள்.',
    csoConsent:
      'THS எனது சார்பாக இந்த வழக்கை எடுத்துக்கொள்ள, அலுவலகத்திற்கு எழுதுவது உட்பட, நான் அனுமதி அளிக்கிறேன். இது இல்லாவிட்டால் குறிப்பு ஆலோசனையை மட்டும் கேட்கும்.',
    csoEmail: 'இந்த வழக்கை THS க்கு மின்னஞ்சல் செய்யுங்கள்',
    csoCopy: 'வழக்குக் குறிப்பை நகலெடு',
    csoDownload: 'குறிப்பைப் பதிவிறக்கு',
    situationCount: '{total} இல் {shown} நிலைகள்',
    documentsSource: 'ஆதாரம்:',
    documentsEnclosure1: 'உங்கள் விண்ணப்பத்தின் ஒரு நகல், அல்லது உங்களிடம் உள்ள அதன் பதிவு',
    documentsEnclosure2: 'அலுவலகம் உங்களுக்கு அனுப்பிய கடிதம், ரசீது அல்லது தகவல்',
    documentsEnclosure3: 'கீழே உள்ள தாளின் இரண்டு நகல்கள், ஒன்றில் முத்திரை வைக்க',
    csoName: 'உங்கள் பெயர் (விருப்பம்)',
    csoMobile: 'மொபைல் எண் (விருப்பம்)',
    csoReference:
      'குறிப்பு: {ref}. மீண்டும் அழைத்தால் அல்லது எழுதினால் இதைச் சொல்லுங்கள். மின்னஞ்சல் செயலி குறிப்பை வெட்டினால், அதைப் பதிவிறக்கி கோப்பை இணைக்கவும்.',
    languageLabel: 'பக்க மொழி',
    note: 'லேபிள்கள் மொழிபெயர்க்கப்பட்டுள்ளன. திட்டம், அலுவலகம், ஆதாரங்கள், கடிதம் ஆங்கிலத்தில் உள்ளன.',
  },
  te: {
    eyebrow: 'టచ్పాయింట్ మ్యాప్లు',
    question: 'సమాధానం ఏ కార్యాలయం ఇవ్వాలి?',
    intro:
      'మీరు ఎక్కడ, ఏం జరిగింది, ఎవరు నిర్ణయిస్తారు, వారిని ఎలా చేరుకోవాలి, ఏం తీసుకెళ్లాలి, అప్పగించే షీట్. చివర్లో THS దీన్ని తీసుకోవాలని చెప్పవచ్చు.',
    step1: 'మీరు ఎక్కడ ఉన్నారు?',
    step2: 'ఏం జరిగింది?',
    step3: 'ఎవరు నిర్ణయిస్తారు?',
    step4: 'వారిని ఎలా చేరుకోవాలి',
    step5: 'తీసుకెళ్లాల్సిన పత్రాలు',
    step6: 'తీసుకెళ్లాల్సిన షీట్',
    step7: 'THS దీన్ని తీసుకోవాలని చెప్పండి',
    chooseScheme:
      'పథకాన్ని ఎంచుకోండి, లేదా పైన ఉన్న పరిస్థితిని ఉపయోగించండి. నిచ్చెన మీ స్థాయి కార్యాలయం నుంచి మంత్రిత్వ శాఖ వరకు వెళ్తుంది.',
    ladder: 'నిచ్చెన, మీ స్థాయి నుంచి పైకి',
    situationLead:
      'సాధనంలోని ప్రతి పరిస్థితి, మొత్తం {n} పథకాల్లో. కూలీ, పైపు నీరు, ఆసుపత్రి లేదా వాయిదా వంటి పదాలు చాలు.',
    situationPlaceholder: 'కూలీ, నీరు, ఆసుపత్రి, వాయిదా',
    situationNone:
      'దీనికి సరిపోయే పరిస్థితి లేదు. సమస్యను మీ మాటల్లో రాయండి, లేదా కింద పథకాన్ని ఎంచుకోండి.',
    contactDirectory: 'ఫోన్ హెల్ప్లైన్లు, రాష్ట్ర ఫిర్యాదు అధికారులు కింది డెలివరీ మ్యాప్లలో ఉన్నారు.',
    documentsLead:
      '{office}, {post} కోసం. ఇది నిచ్చెనలో ఆ కార్యాలయం కోసం నమోదు చేసిన జాబితా; కార్యాలయం అంగీకరించిన చెక్లిస్ట్ కాదు.',
    documentsEnvelope: 'ఎన్వలప్లో పెట్టండి',
    documentsNoPlace: 'పైన స్థలాన్ని ఎంచుకోండి; మీ కార్యాలయానికి నమోదైన పత్రాలు ఇక్కడ కనిపిస్తాయి.',
    documentsCaveat:
      'ఈ జాబితాలో లేని పత్రాన్ని కార్యాలయం అడిగితే, ఆ అవసరాన్ని లిఖితంగా అడగండి; ఆ కాగితాన్ని మిగతావాటితో పాటు ఉంచండి.',
    csoConsent:
      'THS నా తరఫున ఈ కేసును తీసుకోవాలని, కార్యాలయానికి రాయడంతో సహా, నేను అనుమతిస్తున్నాను. ఇది లేకుంటే నోట్ సలహా మాత్రమే అడుగుతుంది.',
    csoEmail: 'ఈ కేసును THS కి ఈమెయిల్ చేయండి',
    csoCopy: 'కేసు నోట్ను కాపీ చేయండి',
    csoDownload: 'నోట్ను డౌన్లోడ్ చేయండి',
    situationCount: '{total}లో {shown} పరిస్థితులు',
    documentsSource: 'మూలం:',
    documentsEnclosure1: 'మీ దరఖాస్తు నకలు, లేదా మీ వద్ద ఉన్న దాని రికార్డు',
    documentsEnclosure2: 'కార్యాలయం మీకు పంపిన ఏ లేఖ, రసీదు లేదా సమాచారం',
    documentsEnclosure3: 'కింది షీట్ రెండు నకలులు, ఒకదానిపై ముద్ర వేయడానికి',
    csoName: 'మీ పేరు (ఐచ్ఛికం)',
    csoMobile: 'మొబైల్ నంబర్ (ఐచ్ఛికం)',
    csoReference:
      'సూచన: {ref}. మళ్లీ కాల్ చేసినా లేదా రాసినా దీన్ని చెప్పండి. మెయిల్ యాప్ నోట్ను కత్తిరిస్తే, డౌన్లోడ్ చేసి ఫైల్ను జోడించండి.',
    languageLabel: 'పేజీ భాష',
    note: 'లేబుళ్లు అనువదించబడ్డాయి. పథకం, కార్యాలయం, మూలాలు, లేఖ ఆంగ్లంలో ఉన్నాయి.',
  },
  kn: {
    eyebrow: 'ಟಚ್ಪಾಯಿಂಟ್ ನಕ್ಷೆಗಳು',
    question: 'ಉತ್ತರವನ್ನು ಯಾವ ಕಚೇರಿ ಕೊಡಬೇಕು?',
    intro:
      'ನೀವು ಎಲ್ಲಿದ್ದೀರಿ, ಏನಾಯಿತು, ಯಾರು ನಿರ್ಧರಿಸುತ್ತಾರೆ, ಅವರನ್ನು ಹೇಗೆ ತಲುಪುವುದು, ಏನು ಒಯ್ಯಬೇಕು, ಒಪ್ಪಿಸುವ ಹಾಳೆ. ಕೊನೆಯಲ್ಲಿ THS ಇದನ್ನು ತೆಗೆದುಕೊಳ್ಳಲಿ ಎಂದು ಕೇಳಬಹುದು.',
    step1: 'ನೀವು ಎಲ್ಲಿದ್ದೀರಿ?',
    step2: 'ಏನಾಯಿತು?',
    step3: 'ಯಾರು ನಿರ್ಧರಿಸುತ್ತಾರೆ?',
    step4: 'ಅವರನ್ನು ಹೇಗೆ ತಲುಪುವುದು',
    step5: 'ಒಯ್ಯಬೇಕಾದ ದಾಖಲೆಗಳು',
    step6: 'ಒಯ್ಯಬೇಕಾದ ಹಾಳೆ',
    step7: 'THS ಇದನ್ನು ತೆಗೆದುಕೊಳ್ಳಲಿ ಎಂದು ಕೇಳಿ',
    chooseScheme:
      'ಯೋಜನೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ, ಅಥವಾ ಮೇಲಿನ ಪರಿಸ್ಥಿತಿಯನ್ನು ಬಳಸಿ. ಏಣಿ ನಿಮ್ಮ ಹಂತದ ಕಚೇರಿಯಿಂದ ಸಚಿವಾಲಯದವರೆಗೆ ಹೋಗುತ್ತದೆ.',
    ladder: 'ಏಣಿ, ನಿಮ್ಮ ಹಂತದಿಂದ ಮೇಲಕ್ಕೆ',
    situationLead:
      'ಸಾಧನದ ಪ್ರತಿ ಪರಿಸ್ಥಿತಿ, ಎಲ್ಲಾ {n} ಯೋಜನೆಗಳಲ್ಲಿ. ಕೂಲಿ, ನಲ್ಲಿ ನೀರು, ಆಸ್ಪತ್ರೆ ಅಥವಾ ಕಂತು ಮುಂತಾದ ಪದಗಳು ಸಾಕು.',
    situationPlaceholder: 'ಕೂಲಿ, ನೀರು, ಆಸ್ಪತ್ರೆ, ಕಂತು',
    situationNone:
      'ಇದಕ್ಕೆ ಹೊಂದುವ ಪರಿಸ್ಥಿತಿ ಇಲ್ಲ. ಸಮಸ್ಯೆಯನ್ನು ನಿಮ್ಮ ಮಾತಿನಲ್ಲಿ ಬರೆಯಿರಿ, ಅಥವಾ ಕೆಳಗೆ ಯೋಜನೆ ಆಯ್ಕೆಮಾಡಿ.',
    contactDirectory: 'ಫೋನ್ ಸಹಾಯವಾಣಿಗಳು ಮತ್ತು ರಾಜ್ಯ ದೂರು ಅಧಿಕಾರಿಗಳು ಕೆಳಗಿನ ಡೆಲಿವರಿ ನಕ್ಷೆಗಳಲ್ಲಿದ್ದಾರೆ.',
    documentsLead:
      '{office}, {post} ಗಾಗಿ. ಇದು ಏಣಿಯಲ್ಲಿ ಆ ಕಚೇರಿಗೆ ದಾಖಲಾದ ಪಟ್ಟಿ; ಕಚೇರಿ ಒಪ್ಪಿದ ಪರಿಶೀಲನಾ ಪಟ್ಟಿ ಅಲ್ಲ.',
    documentsEnvelope: 'ಲಕೋಟೆಯಲ್ಲಿ ಹಾಕಿ',
    documentsNoPlace: 'ಮೇಲೆ ಸ್ಥಳ ಆಯ್ಕೆಮಾಡಿ; ನಿಮ್ಮ ಕಚೇರಿಗೆ ದಾಖಲಾದ ದಾಖಲೆಗಳು ಇಲ್ಲಿ ಕಾಣುತ್ತವೆ.',
    documentsCaveat:
      'ಈ ಪಟ್ಟಿಯಲ್ಲಿ ಇಲ್ಲದ ದಾಖಲೆಯನ್ನು ಕಚೇರಿ ಕೇಳಿದರೆ, ಅದನ್ನು ಲಿಖಿತವಾಗಿ ಕೇಳಿ; ಆ ಕಾಗದವನ್ನು ಉಳಿದವುಗಳೊಂದಿಗೆ ಇರಿಸಿ.',
    csoConsent:
      'THS ನನ್ನ ಪರವಾಗಿ ಈ ಪ್ರಕರಣವನ್ನು ತೆಗೆದುಕೊಳ್ಳಲು, ಕಚೇರಿಗೆ ಬರೆಯುವುದೂ ಸೇರಿ, ನಾನು ಅನುಮತಿ ನೀಡುತ್ತೇನೆ. ಇದಿಲ್ಲದಿದ್ದರೆ ಟಿಪ್ಪಣಿ ಸಲಹೆ ಮಾತ್ರ ಕೇಳುತ್ತದೆ.',
    csoEmail: 'ಈ ಪ್ರಕರಣವನ್ನು THS ಗೆ ಇಮೇಲ್ ಮಾಡಿ',
    csoCopy: 'ಪ್ರಕರಣ ಟಿಪ್ಪಣಿ ನಕಲಿಸಿ',
    csoDownload: 'ಟಿಪ್ಪಣಿ ಡೌನ್ಲೋಡ್ ಮಾಡಿ',
    situationCount: '{total} ರಲ್ಲಿ {shown} ಪರಿಸ್ಥಿತಿಗಳು',
    documentsSource: 'ಮೂಲ:',
    documentsEnclosure1: 'ನಿಮ್ಮ ಅರ್ಜಿಯ ಪ್ರತಿ, ಅಥವಾ ನಿಮ್ಮ ಬಳಿ ಇರುವ ಅದರ ದಾಖಲೆ',
    documentsEnclosure2: 'ಕಚೇರಿ ನಿಮಗೆ ಕಳುಹಿಸಿದ ಯಾವುದೇ ಪತ್ರ, ರಸೀದಿ ಅಥವಾ ಮಾಹಿತಿ',
    documentsEnclosure3: 'ಕೆಳಗಿನ ಹಾಳೆಯ ಎರಡು ಪ್ರತಿಗಳು, ಒಂದಕ್ಕೆ ಮುದ್ರೆ ಹಾಕಲು',
    csoName: 'ನಿಮ್ಮ ಹೆಸರು (ಐಚ್ಛಿಕ)',
    csoMobile: 'ಮೊಬೈಲ್ ಸಂಖ್ಯೆ (ಐಚ್ಛಿಕ)',
    csoReference:
      'ಉಲ್ಲೇಖ: {ref}. ಮತ್ತೆ ಕರೆ ಮಾಡಿದರೆ ಅಥವಾ ಬರೆದರೆ ಇದನ್ನು ಹೇಳಿ. ಮೇಲ್ ಆ್ಯಪ್ ಟಿಪ್ಪಣಿಯನ್ನು ಕತ್ತರಿಸಿದರೆ, ಡೌನ್ಲೋಡ್ ಮಾಡಿ ಫೈಲ್ ಲಗತ್ತಿಸಿ.',
    languageLabel: 'ಪುಟದ ಭಾಷೆ',
    note: 'ಲೇಬಲ್ಗಳು ಅನುವಾದಗೊಂಡಿವೆ. ಯೋಜನೆ, ಕಚೇರಿ, ಮೂಲಗಳು ಮತ್ತು ಪತ್ರ ಇಂಗ್ಲಿಷ್ನಲ್ಲಿವೆ.',
  },
  ml: {
    eyebrow: 'ടച്ച്പോയിന്റ് മാപ്പുകൾ',
    question: 'ഉത്തരം ഏത് ഓഫീസ് നൽകണം?',
    intro:
      'നിങ്ങൾ എവിടെ, എന്ത് സംഭവിച്ചു, ആരാണ് തീരുമാനിക്കുന്നത്, അവരിലേക്ക് എങ്ങനെ എത്താം, എന്ത് കൊണ്ടുപോകണം, ഏൽപ്പിക്കേണ്ട ഷീറ്റ്. അവസാനം THS ഇത് ഏറ്റെടുക്കാൻ പറയാം.',
    step1: 'നിങ്ങൾ എവിടെയാണ്?',
    step2: 'എന്താണ് സംഭവിച്ചത്?',
    step3: 'ആരാണ് തീരുമാനിക്കുന്നത്?',
    step4: 'അവരിലേക്ക് എങ്ങനെ എത്താം',
    step5: 'കൊണ്ടുപോകേണ്ട രേഖകൾ',
    step6: 'കൊണ്ടുപോകേണ്ട ഷീറ്റ്',
    step7: 'THS ഇത് ഏറ്റെടുക്കാൻ പറയുക',
    chooseScheme:
      'പദ്ധതി തിരഞ്ഞെടുക്കുക, അല്ലെങ്കിൽ മുകളിലെ സാഹചര്യം ഉപയോഗിക്കുക. ഗോവണി നിങ്ങളുടെ തലത്തിലെ ഓഫീസിൽ നിന്ന് മന്ത്രാലയം വരെ പോകുന്നു.',
    ladder: 'ഗോവണി, നിങ്ങളുടെ തലത്തിൽ നിന്ന് മുകളിലേക്ക്',
    situationLead:
      'ഉപകരണത്തിലെ എല്ലാ സാഹചര്യങ്ങളും, എല്ലാ {n} പദ്ധതികളിലും. കൂലി, ടാപ്പ് വെള്ളം, ആശുപത്രി അല്ലെങ്കിൽ ഗഡു പോലുള്ള വാക്കുകൾ മതി.',
    situationPlaceholder: 'കൂലി, വെള്ളം, ആശുപത്രി, ഗഡു',
    situationNone:
      'ഇതിന് യോജിക്കുന്ന സാഹചര്യമില്ല. പ്രശ്നം നിങ്ങളുടെ വാക്കുകളിൽ എഴുതുക, അല്ലെങ്കിൽ താഴെ പദ്ധതി തിരഞ്ഞെടുക്കുക.',
    contactDirectory: 'ഫോൺ ഹെൽപ്പ്ലൈനുകളും സംസ്ഥാന പരാതി ഉദ്യോഗസ്ഥരും താഴെയുള്ള ഡെലിവറി മാപ്പുകളിലുണ്ട്.',
    documentsLead:
      '{office}, {post} എന്നതിനായി. ഇത് ഗോവണിയിൽ ആ ഓഫീസിനായി രേഖപ്പെടുത്തിയ പട്ടികയാണ്; ഓഫീസ് സമ്മതിച്ച ചെക്ക്ലിസ്റ്റല്ല.',
    documentsEnvelope: 'എൻവലപ്പിൽ ഇടുക',
    documentsNoPlace: 'മുകളിൽ ഒരു സ്ഥലം തിരഞ്ഞെടുക്കുക; നിങ്ങളുടെ ഓഫീസിനായി രേഖപ്പെടുത്തിയ രേഖകൾ ഇവിടെ കാണാം.',
    documentsCaveat:
      'ഈ പട്ടികയിലില്ലാത്ത രേഖ ഓഫീസ് ആവശ്യപ്പെട്ടാൽ, ആവശ്യകത എഴുത്തിൽ ആവശ്യപ്പെടുക; ആ കടലാസ് ബാക്കിയുള്ളവയോടൊപ്പം സൂക്ഷിക്കുക.',
    csoConsent:
      'THS എന്റെ പേരിൽ ഈ കേസ് ഏറ്റെടുക്കാൻ, ഓഫീസിന് എഴുതുന്നതുൾപ്പെടെ, ഞാൻ അനുമതി നൽകുന്നു. ഇതില്ലെങ്കിൽ കുറിപ്പ് ഉപദേശം മാത്രം ആവശ്യപ്പെടും.',
    csoEmail: 'ഈ കേസ് THS-ന് ഇമെയിൽ ചെയ്യുക',
    csoCopy: 'കേസ് കുറിപ്പ് പകർത്തുക',
    csoDownload: 'കുറിപ്പ് ഡൗൺലോഡ് ചെയ്യുക',
    situationCount: '{total} ൽ {shown} സാഹചര്യങ്ങൾ',
    documentsSource: 'സ്രോതസ്സ്:',
    documentsEnclosure1: 'നിങ്ങളുടെ അപേക്ഷയുടെ പകർപ്പ്, അല്ലെങ്കിൽ നിങ്ങളുടെ കൈവശമുള്ള അതിന്റെ രേഖ',
    documentsEnclosure2: 'ഓഫീസ് നിങ്ങൾക്ക് അയച്ച കത്ത്, രസീത് അല്ലെങ്കിൽ അറിയിപ്പ്',
    documentsEnclosure3: 'താഴെയുള്ള ഷീറ്റിന്റെ രണ്ട് പകർപ്പുകൾ, ഒന്നിൽ മുദ്ര വയ്ക്കാൻ',
    csoName: 'നിങ്ങളുടെ പേര് (ഓപ്ഷണൽ)',
    csoMobile: 'മൊബൈൽ നമ്പർ (ഓപ്ഷണൽ)',
    csoReference:
      'റഫറൻസ്: {ref}. വീണ്ടും വിളിക്കുകയോ എഴുതുകയോ ചെയ്താൽ ഇത് പറയുക. മെയിൽ ആപ്പ് കുറിപ്പ് മുറിച്ചാൽ, ഡൗൺലോഡ് ചെയ്ത് ഫയൽ അറ്റാച്ച് ചെയ്യുക.',
    languageLabel: 'പേജിന്റെ ഭാഷ',
    note: 'ലേബലുകൾ വിവർത്തനം ചെയ്തിട്ടുണ്ട്. പദ്ധതി, ഓഫീസ്, സ്രോതസ്സുകൾ, കത്ത് എന്നിവ ഇംഗ്ലീഷിലാണ്.',
  },
  ur: {
    eyebrow: 'ٹچ پوائنٹ نقشے',
    question: 'جواب کون سا دفتر دے گا؟',
    intro:
      'آپ کہاں ہیں، کیا ہوا، فیصلہ کون کرتا ہے، ان تک کیسے پہنچیں، کیا ساتھ لے جائیں، اور حوالے کرنے والی شیٹ۔ آخر میں آپ THS سے کہہ سکتے ہیں کہ وہ کیس اٹھائے۔',
    step1: 'آپ کہاں ہیں؟',
    step2: 'کیا ہوا؟',
    step3: 'فیصلہ کون کرتا ہے؟',
    step4: 'ان تک کیسے پہنچیں',
    step5: 'ساتھ لے جانے والے دستاویزات',
    step6: 'ساتھ لے جانے والی شیٹ',
    step7: 'THS سے کہیں کہ یہ کیس لے',
    chooseScheme:
      'اسکیم منتخب کریں، یا اوپر دی گئی صورتحال استعمال کریں۔ سیڑھی آپ کی سطح کے دفتر سے شروع ہو کر وزارت تک جاتی ہے۔',
    ladder: 'سیڑھی، آپ کی سطح سے اوپر',
    situationLead:
      'ٹول کی ہر صورتحال، تمام {n} اسکیموں میں۔ مزدوری، نل کا پانی، ہسپتال یا قسط جیسے الفاظ کافی ہیں۔',
    situationPlaceholder: 'مزدوری، پانی، ہسپتال، قسط',
    situationNone: 'اس سے ملتی کوئی صورتحال نہیں۔ مسئلہ اپنے الفاظ میں لکھیں، یا نیچے اسکیم منتخب کریں۔',
    contactDirectory: 'فون ہیلپ لائنز اور ریاستی شکایت افسران نیچے دیے گئے ڈیلیوری نقشوں میں ہیں۔',
    documentsLead:
      '{office}, {post} کے لیے۔ یہ سیڑھی میں اس دفتر کے لیے درج فہرست ہے، دفتر کی منظور شدہ چیک لسٹ نہیں۔',
    documentsEnvelope: 'لفافے میں رکھیں',
    documentsNoPlace: 'اوپر جگہ منتخب کریں، اور آپ کے دفتر کے لیے درج دستاویزات یہاں دکھائی دیں گی۔',
    documentsCaveat:
      'اگر دفتر اس فہرست میں نہ ہوں ایسی دستاویز مانگے تو تحریری طور پر مانگیں اور وہ کاغذ باقی کے ساتھ رکھیں۔',
    csoConsent:
      'میں THS کو اجازت دیتا/دیتی ہوں کہ وہ میری طرف سے یہ کیس اٹھائے، جس میں دفتر کو لکھنا بھی شامل ہے۔ اس کے بغیر نوٹ صرف مشورہ مانگے گا۔',
    csoEmail: 'یہ کیس THS کو ای میل کریں',
    csoCopy: 'کیس نوٹ کاپی کریں',
    csoDownload: 'نوٹ ڈاؤن لوڈ کریں',
    situationCount: '{total} میں سے {shown} صورتحال',
    documentsSource: 'ماخذ:',
    documentsEnclosure1: 'آپ کی درخواست کی ایک نقل، یا اس کا ریکارڈ جو آپ کے پاس ہے',
    documentsEnclosure2: 'دفتر نے آپ کو بھیجا ہوا کوئی خط، رسید یا اطلاع',
    documentsEnclosure3: 'نیچے دی گئی شیٹ کی دو نقلیں، تاکہ ایک پر مہر لگ سکے',
    csoName: 'آپ کا نام (اختیاری)',
    csoMobile: 'موبائل نمبر (اختیاری)',
    csoReference:
      'حوالہ: {ref}۔ دوبارہ فون یا تحریر کریں تو یہ بتائیں۔ اگر میل ایپ نوٹ کاٹ دے تو اسے ڈاؤن لوڈ کر کے فائل منسلک کریں۔',
    languageLabel: 'صفحے کی زبان',
    note: 'لیبلز کا ترجمہ ہوا ہے۔ اسکیم، دفتر، ذرائع اور خط انگریزی میں ہیں۔',
  },
};

export function copyFor(code) {
  return {
    ...EN,
    ...(SAMPARK_COPY[code] || SAMPARK_COPY.en),
    ...(SAMPARK_UI[code] || SAMPARK_UI.en),
    ...(SAMPARK_UI_EXTRA[code] || SAMPARK_UI_EXTRA.en),
    ...(SAMPARK_UI_GUIDE[code] || SAMPARK_UI_GUIDE.en),
    ...(SAMPARK_UI_FOLD[code] || SAMPARK_UI_FOLD.en),
  };
}

export function fill(template, values) {
  return String(template).replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(values, key) ? values[key] : match
  );
}
