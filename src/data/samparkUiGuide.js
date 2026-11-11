// The first screen a frightened or exhausted reader sees.
//
// Sampark is used by people who may not know a scheme's name, may be reading
// on someone else's phone, and may need a relative, volunteer or CSC staff
// member to drive. These five strings are the page's promise: start with what
// happened, not with a form; no account; help is allowed; stopping is allowed;
// and the tool is becoming an independent CSO, not a THS product.
//
// They are page chrome, not corpus. Every locale must carry all five strings;
// copyFor() does not fill a missing key from English.

export const SAMPARK_UI_GUIDE = {
  en: {
    guideEyebrow: 'Start here',
    guideTitle: 'You do not need to know the scheme.',
    guideLead:
      'Tell us what happened. We will show the office, what to carry, and a letter you can hand over.',
    guidePromise:
      'No account. Nothing is sent until you choose. A relative, volunteer or CSC staff member can help, and you can stop and return to this link.',
    csoAffiliation:
      'Sampark is becoming an independent CSO, affiliated with THS. Read how it will be governed.',
  },
  hi: {
    guideEyebrow: 'यहाँ से शुरू करें',
    guideTitle: 'योजना का नाम जानना ज़रूरी नहीं।',
    guideLead:
      'बताइए क्या हुआ। हम कार्यालय, साथ ले जाने वाले काग़ज़ और सौंपने के लिए एक पत्र दिखाएँगे।',
    guidePromise:
      'कोई खाता नहीं। जब तक आप चुनें, कुछ नहीं भेजा जाता। कोई रिश्तेदार, स्वयंसेवक या CSC कर्मचारी मदद कर सकता है; आप रुककर इसी लिंक पर लौट सकते हैं।',
    csoAffiliation:
      'संपर्क एक स्वतंत्र सीएसओ बन रहा है, जो THS से संबद्ध है। पढ़ें कि उसका संचालन कैसे होगा।',
  },
  bn: {
    guideEyebrow: 'এখান থেকে শুরু করুন',
    guideTitle: 'প্রকল্পের নাম জানা দরকার নেই।',
    guideLead:
      'কী ঘটেছে বলুন। আমরা দপ্তর, সঙ্গে নেওয়ার কাগজপত্র এবং হস্তান্তরের জন্য একটি চিঠি দেখাব।',
    guidePromise:
      'কোনও অ্যাকাউন্ট নেই। আপনি না চাইলে কিছু পাঠানো হয় না। কোনও আত্মীয়, স্বেচ্ছাসেবক বা CSC কর্মী সাহায্য করতে পারেন; আপনি থামিয়ে এই লিঙ্কে ফিরে আসতে পারেন।',
    csoAffiliation:
      'সম্পর্ক একটি স্বাধীন সিএসও হয়ে উঠছে, যা THS-এর সঙ্গে সংযুক্ত। এটি কীভাবে পরিচালিত হবে তা পড়ুন।',
  },
  gu: {
    guideEyebrow: 'અહીંથી શરૂ કરો',
    guideTitle: 'યોજનાનું નામ જાણવું જરૂરી નથી.',
    guideLead:
      'શું થયું તે કહો. અમે કચેરી, સાથે લઈ જવાના કાગળો અને સોંપવા માટે એક પત્ર બતાવીશું.',
    guidePromise:
      'કોઈ ખાતાની જરૂર નથી. તમે પસંદ ન કરો ત્યાં સુધી કંઈ મોકલાતું નથી. કોઈ સંબંધી, સ્વયંસેવક કે CSC કર્મચારી મદદ કરી શકે છે; તમે અટકીને આ જ લિંક પર પાછા આવી શકો છો.',
    csoAffiliation:
      'સંપર્ક એક સ્વતંત્ર સીએસઓ બની રહ્યું છે, જે THS સાથે જોડાયેલું છે. તે કેવી રીતે સંચાલિત થશે તે વાંચો.',
  },
  ta: {
    guideEyebrow: 'இங்கே தொடங்குங்கள்',
    guideTitle: 'திட்டத்தின் பெயர் தெரிய வேண்டியதில்லை.',
    guideLead:
      'என்ன நடந்தது என்று சொல்லுங்கள். அலுவலகம், எடுத்துச் செல்ல வேண்டிய ஆவணங்கள், ஒப்படைக்க ஒரு கடிதம்—இவற்றைக் காட்டுவோம்.',
    guidePromise:
      'கணக்கு இல்லை. நீங்கள் தேர்ந்தெடுக்கும் வரை எதுவும் அனுப்பப்படாது. உறவினர், தன்னார்வலர் அல்லது CSC ஊழியர் உதவலாம்; நிறுத்திவிட்டு இதே இணைப்புக்குத் திரும்பலாம்.',
    csoAffiliation:
      'சம்பர்க் THS-உடன் இணைந்த, ஒரு சுயாதீன சிஎஸ்ஓவாக உருவாகிறது. அது எவ்வாறு நிர்வகிக்கப்படும் என்பதைப் படியுங்கள்.',
  },
  te: {
    guideEyebrow: 'ఇక్కడ ప్రారంభించండి',
    guideTitle: 'పథకం పేరు తెలియాల్సిన అవసరం లేదు.',
    guideLead:
      'ఏం జరిగిందో చెప్పండి. కార్యాలయం, తీసుకెళ్లాల్సిన పత్రాలు, అప్పగించడానికి ఒక ఉత్తరం చూపిస్తాము.',
    guidePromise:
      'ఖాతా అవసరం లేదు. మీరు ఎంచుకునే వరకు ఏదీ పంపబడదు. బంధువు, వాలంటీర్ లేదా CSC సిబ్బంది సహాయం చేయవచ్చు; ఆపి ఈ లింక్కే తిరిగి రావచ్చు.',
    csoAffiliation:
      'సంపర్క్ THSతో అనుబంధంగా ఉన్న స్వతంత్ర CSOగా రూపొందుతోంది. అది ఎలా నిర్వహించబడుతుందో చదవండి.',
  },
  kn: {
    guideEyebrow: 'ಇಲ್ಲಿ ಪ್ರಾರಂಭಿಸಿ',
    guideTitle: 'ಯೋಜನೆಯ ಹೆಸರು ತಿಳಿಯಬೇಕಿಲ್ಲ.',
    guideLead:
      'ಏನು ಸಂಭವಿಸಿತು ಎಂದು ಹೇಳಿ. ಕಚೇರಿ, ಒಯ್ಯಬೇಕಾದ ದಾಖಲೆಗಳು ಮತ್ತು ಒಪ್ಪಿಸಲು ಒಂದು ಪತ್ರ ತೋರಿಸುತ್ತೇವೆ.',
    guidePromise:
      'ಖಾತೆ ಬೇಕಿಲ್ಲ. ನೀವು ಆಯ್ಕೆ ಮಾಡುವವರೆಗೆ ಏನೂ ಕಳುಹಿಸುವುದಿಲ್ಲ. ಸಂಬಂಧಿಕರು, ಸ್ವಯಂಸೇವಕರು ಅಥವಾ CSC ಸಿಬ್ಬಂದಿ ಸಹಾಯ ಮಾಡಬಹುದು; ನಿಲ್ಲಿಸಿ ಈ ಲಿಂಕ್‌ಗೆ ಮರಳಬಹುದು.',
    csoAffiliation:
      'ಸಂಪರ್ಕ THS ಜೊತೆ ಸಂಬಂಧ ಹೊಂದಿರುವ ಸ್ವತಂತ್ರ CSO ಆಗಿ ರೂಪುಗೊಳ್ಳುತ್ತಿದೆ. ಅದನ್ನು ಹೇಗೆ ನಿರ್ವಹಿಸಲಾಗುತ್ತದೆ ಎಂದು ಓದಿ.',
  },
  ml: {
    guideEyebrow: 'ഇവിടെ തുടങ്ങുക',
    guideTitle: 'പദ്ധതിയുടെ പേര് അറിയേണ്ടതില്ല.',
    guideLead:
      'എന്താണ് സംഭവിച്ചതെന്ന് പറയുക. ഓഫീസ്, കൊണ്ടുപോകേണ്ട രേഖകൾ, ഏൽപ്പിക്കാൻ ഒരു കത്ത്—ഇവ ഞങ്ങൾ കാണിക്കും.',
    guidePromise:
      'അക്കൗണ്ട് വേണ്ട. നിങ്ങൾ തിരഞ്ഞെടുക്കുന്നതുവരെ ഒന്നും അയയ്ക്കില്ല. ബന്ധു, സന്നദ്ധപ്രവർത്തകൻ അല്ലെങ്കിൽ CSC ജീവനക്കാർക്ക് സഹായിക്കാം; നിർത്തി ഈ ലിങ്കിലേക്ക് തിരികെ വരാം.',
    csoAffiliation:
      'സമ്പർക്കം THS-മായി ബന്ധപ്പെട്ട സ്വതന്ത്ര സിഎസ്ഒ ആയി രൂപപ്പെടുന്നു. അത് എങ്ങനെ ഭരിക്കപ്പെടും എന്ന് വായിക്കുക.',
  },
  ur: {
    guideEyebrow: 'یہاں سے شروع کریں',
    guideTitle: 'اسکیم کا نام جاننا ضروری نہیں۔',
    guideLead:
      'بتائیں کیا ہوا۔ ہم دفتر، ساتھ لے جانے والے کاغذات اور حوالے کرنے کے لیے ایک خط دکھائیں گے۔',
    guidePromise:
      'کوئی اکاؤنٹ نہیں۔ جب تک آپ نہ چنیں، کچھ نہیں بھیجا جاتا۔ کوئی رشتہ دار، رضاکار یا CSC عملہ مدد کر سکتا ہے؛ آپ رک کر اسی لنک پر واپس آ سکتے ہیں۔',
    csoAffiliation:
      'سمپارک THS سے وابستہ ایک خودمختار CSO بن رہا ہے۔ پڑھیں کہ اسے کیسے چلایا جائے گا۔',
  },
};
