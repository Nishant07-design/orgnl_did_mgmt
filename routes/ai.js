const express = require('express');
const router = express.Router();

// Knowledge base - disaster guidance in English and Hindi
const KB = {
  flood: {
    en: {
      safety: [
        'Move immediately to higher ground. Do not wait for water to rise.',
        'Never walk or drive through floodwater. Even 15cm can knock you down.',
        'Turn off electricity at the main switch if safe to do so.',
        'Keep emergency supplies: drinking water, food, medicines, torch, radio.',
        'Follow evacuation routes announced by authorities.',
        'Call NDRF emergency: 011-24363260 or National Emergency: 112',
      ],
      evacuation: 'Move to the nearest relief camp. Follow SDRF/NDRF instructions. Take important documents in waterproof bags.',
      kit: 'Emergency kit: Water (3L per person per day), food (3-day supply), first aid, medicines, torch, radio, ID documents, cash.',
    },
    hi: {
      safety: [
        'तुरंत ऊंची जगह पर जाएं। बाढ़ का पानी बढ़ने का इंतजार न करें।',
        'कभी भी बाढ़ के पानी में न चलें या गाड़ी न चलाएं।',
        'यदि सुरक्षित हो तो मुख्य स्विच से बिजली बंद करें।',
        'पीने का पानी, खाना, दवाइयां, टॉर्च और रेडियो रखें।',
        'अधिकारियों द्वारा घोषित निकासी मार्गों का पालन करें।',
        'NDRF आपातकाल: 011-24363260 | राष्ट्रीय आपातकाल: 112',
      ],
      evacuation: 'निकटतम राहत शिविर में जाएं। SDRF/NDRF निर्देशों का पालन करें।',
      kit: 'आपातकालीन किट: पानी (प्रतिदिन 3 लीटर प्रति व्यक्ति), 3 दिन का खाना, प्राथमिक चिकित्सा, दवाइयां।',
    }
  },
  earthquake: {
    en: {
      safety: [
        'DROP, COVER and HOLD ON. Get under a sturdy table or cover your head.',
        'Stay away from windows, outside walls and heavy furniture.',
        'If outdoors, move away from buildings, trees, and power lines.',
        'After shaking stops, check for injuries and exit carefully.',
        'Watch for aftershocks. Be prepared for further shaking.',
        'Do not use elevators. Use stairs.',
      ],
      evacuation: 'Exit building from nearest stairs. Go to open ground away from structures.',
      kit: 'Keep shoes near bed. Have a whistle to signal rescuers if trapped.',
    },
    hi: {
      safety: [
        'झुकें, ढकें और पकड़ें। मजबूत मेज के नीचे जाएं।',
        'खिड़कियों, बाहरी दीवारों और भारी फर्नीचर से दूर रहें।',
        'यदि बाहर हैं तो इमारतों, पेड़ों से दूर जाएं।',
        'कंपन रुकने के बाद सावधानी से बाहर निकलें।',
        'आफ्टरशॉक के लिए तैयार रहें।',
        'लिफ्ट का उपयोग न करें। सीढ़ियों का उपयोग करें।',
      ],
      evacuation: 'निकटतम सीढ़ियों से बाहर निकलें। इमारतों से दूर खुले मैदान में जाएं।',
      kit: 'बिस्तर के पास जूते रखें। फंसे होने पर संकेत के लिए सीटी रखें।',
    }
  },
  cyclone: {
    en: {
      safety: [
        'Evacuate coastal areas immediately when red alert is issued.',
        'Secure loose objects outside your house.',
        'Fill water containers before the cyclone hits.',
        'Stay indoors in the strongest part of your house during the storm.',
        'Do not go outside during the eye of the cyclone - storm will resume.',
        'IMD Cyclone Warning: 1800-180-1717 (Toll Free)',
      ],
      evacuation: 'Move to cyclone shelter or pucca building. Carry emergency kit. Register at relief camp.',
      kit: 'Prepare: Water, food, medicines, documents, cash, warm clothes, radio for IMD updates.',
    },
    hi: {
      safety: [
        'रेड अलर्ट जारी होने पर तटीय क्षेत्रों को तुरंत खाली करें।',
        'घर के बाहर की ढीली चीजें सुरक्षित करें।',
        'चक्रवात आने से पहले पानी के बर्तन भर लें।',
        'तूफान के दौरान घर के सबसे मजबूत हिस्से में रहें।',
        'चक्रवात की आंख के दौरान बाहर न जाएं।',
        'IMD चक्रवात चेतावनी: 1800-180-1717 (टोल फ्री)',
      ],
      evacuation: 'चक्रवात आश्रय या पक्की इमारत में जाएं। आपातकालीन किट ले जाएं।',
      kit: 'तैयार रखें: पानी, खाना, दवाइयां, दस्तावेज, नकदी, गर्म कपड़े, रेडियो।',
    }
  },
  fire: {
    en: {
      safety: [
        'Alert everyone and call fire brigade: 101',
        'Evacuate immediately using nearest exit. Do not use elevators.',
        'Close doors behind you to slow fire spread.',
        'Stay low if there is smoke - breathe cleaner air near floor.',
        'If clothes catch fire: STOP, DROP, and ROLL.',
        'Never go back inside a burning building.',
      ],
      evacuation: 'Exit immediately. Call 101. Meet at designated assembly point.',
      kit: 'Install smoke detectors. Keep fire extinguisher accessible. Know two exit routes.',
    },
    hi: {
      safety: [
        'सभी को सतर्क करें और अग्निशमन दल को कॉल करें: 101',
        'निकटतम निकास से तुरंत बाहर निकलें। लिफ्ट का उपयोग न करें।',
        'आग फैलने को धीमा करने के लिए दरवाजे बंद करें।',
        'धुएं में नीचे रहें - फर्श के पास साफ हवा मिलती है।',
        'कपड़ों में आग लगे तो: रुकें, गिरें और लुढ़कें।',
        'जलती हुई इमारत के अंदर वापस न जाएं।',
      ],
      evacuation: 'तुरंत बाहर निकलें। 101 पर कॉल करें। नियत स्थान पर मिलें।',
      kit: 'स्मोक डिटेक्टर लगाएं। अग्निशामक यंत्र रखें। दो निकास मार्ग जानें।',
    }
  },
  landslide: {
    en: {
      safety: [
        'Move away from the landslide path immediately.',
        'If escape is not possible, curl into a ball and protect your head.',
        'Listen for unusual sounds - cracking trees, boulders moving.',
        'Stay away from the slide area - risk of secondary slides.',
        'Do not enter damaged areas until authorities declare safe.',
        'Contact: District Disaster Management: 1077 (Helpline)',
      ],
      evacuation: 'Move perpendicular to the landslide direction. Seek higher ground.',
      kit: 'Have emergency supplies ready if living in hilly terrain. Know evacuation routes.',
    },
    hi: {
      safety: [
        'तुरंत भूस्खलन के रास्ते से हट जाएं।',
        'यदि बचना संभव न हो तो गेंद की तरह सिकुड़ें और सिर को बचाएं।',
        'असामान्य आवाजें सुनें - टूटते पेड़, हिलते पत्थर।',
        'स्लाइड क्षेत्र से दूर रहें - द्वितीयक स्लाइड का खतरा।',
        'अधिकारियों द्वारा सुरक्षित घोषित होने तक क्षतिग्रस्त क्षेत्रों में न जाएं।',
        'जिला आपदा प्रबंधन: 1077 (हेल्पलाइन)',
      ],
      evacuation: 'भूस्खलन दिशा के लंबवत हटें। ऊंची जमीन पर जाएं।',
      kit: 'पहाड़ी इलाके में रहते हैं तो आपातकालीन आपूर्ति तैयार रखें।',
    }
  },
  heatwave: {
    en: {
      safety: [
        'Stay indoors during peak hours (11am - 4pm).',
        'Drink water regularly even if not thirsty.',
        'Wear light-coloured, loose, cotton clothing.',
        'Use ORS (Oral Rehydration Solution) if feeling dehydrated.',
        'Check on elderly, children, and sick neighbours.',
        'National Heat Helpline: 104 (Health Ministry)',
      ],
      evacuation: 'Move to air-conditioned or shaded public spaces like malls, libraries.',
      kit: 'Keep ORS packets, water, cooling towel, umbrella, sunscreen SPF 30+.',
    },
    hi: {
      safety: [
        'पीक आवर्स (11 बजे - 4 बजे) के दौरान घर के अंदर रहें।',
        'प्यास न लगने पर भी नियमित रूप से पानी पिएं।',
        'हल्के रंग के, ढीले, सूती कपड़े पहनें।',
        'निर्जलीकरण महसूस होने पर ORS (ओरल रिहाइड्रेशन सॉल्यूशन) का उपयोग करें।',
        'बुजुर्गों, बच्चों और बीमार पड़ोसियों की देखभाल करें।',
        'राष्ट्रीय हीट हेल्पलाइन: 104 (स्वास्थ्य मंत्रालय)',
      ],
      evacuation: 'वातानुकूलित या छायादार सार्वजनिक स्थानों जैसे मॉल, पुस्तकालय में जाएं।',
      kit: 'ORS पैकेट, पानी, ठंडा तौलिया, छाता, SPF 30+ सनस्क्रीन रखें।',
    }
  },
};

const emergencyContacts = {
  en: [
    { name: 'National Emergency', number: '112', desc: 'Single emergency number for police, fire, ambulance' },
    { name: 'NDRF Control Room', number: '011-24363260', desc: 'National Disaster Response Force' },
    { name: 'Fire Brigade', number: '101', desc: 'Fire emergency' },
    { name: 'Ambulance', number: '108', desc: 'Medical emergency' },
    { name: 'Police', number: '100', desc: 'Law enforcement' },
    { name: 'Disaster Helpline', number: '1077', desc: 'State disaster management helpline' },
    { name: 'IMD Weather', number: '1800-180-1717', desc: 'India Meteorological Department (Toll Free)' },
    { name: 'Health Helpline', number: '104', desc: 'Medical advice and heat helpline' },
  ],
  hi: [
    { name: 'राष्ट्रीय आपातकाल', number: '112', desc: 'पुलिस, अग्नि, एम्बुलेंस के लिए' },
    { name: 'NDRF नियंत्रण कक्ष', number: '011-24363260', desc: 'राष्ट्रीय आपदा प्रतिक्रिया बल' },
    { name: 'अग्निशमन', number: '101', desc: 'आग की आपात स्थिति' },
    { name: 'एम्बुलेंस', number: '108', desc: 'चिकित्सा आपातकाल' },
    { name: 'पुलिस', number: '100', desc: 'कानून प्रवर्तन' },
    { name: 'आपदा हेल्पलाइन', number: '1077', desc: 'राज्य आपदा प्रबंधन हेल्पलाइन' },
    { name: 'IMD मौसम', number: '1800-180-1717', desc: 'भारतीय मौसम विज्ञान विभाग (टोल फ्री)' },
  ]
};

router.get('/', (req, res) => {
  res.render('ai/guide', { title: 'AI Safety Guide', user: req.session.user, KB, emergencyContacts });
});

router.post('/ask', (req, res) => {
  const { question, lang = 'en' } = req.body;
  const q = question.toLowerCase();
  const l = lang === 'hi' ? 'hi' : 'en';

  let response = null;
  let category = null;

  if (q.includes('flood') || q.includes('बाढ़') || q.includes('flooding')) {
    category = 'flood'; response = KB.flood[l];
  } else if (q.includes('earthquake') || q.includes('भूकंप') || q.includes('tremor')) {
    category = 'earthquake'; response = KB.earthquake[l];
  } else if (q.includes('cyclone') || q.includes('चक्रवात') || q.includes('hurricane') || q.includes('storm')) {
    category = 'cyclone'; response = KB.cyclone[l];
  } else if (q.includes('fire') || q.includes('आग') || q.includes('wildfire')) {
    category = 'fire'; response = KB.fire[l];
  } else if (q.includes('landslide') || q.includes('भूस्खलन')) {
    category = 'landslide'; response = KB.landslide[l];
  } else if (q.includes('heat') || q.includes('गर्मी') || q.includes('heatwave') || q.includes('लू')) {
    category = 'heatwave'; response = KB.heatwave[l];
  } else if (q.includes('emergency') || q.includes('आपातकाल') || q.includes('number') || q.includes('contact') || q.includes('helpline')) {
    return res.json({ category: 'contacts', contacts: emergencyContacts[l], lang: l });
  } else if (q.includes('kit') || q.includes('किट') || q.includes('prepare') || q.includes('तैयारी')) {
    const msg = l === 'hi'
      ? 'आपदा किट में शामिल करें: पीने का पानी (3L/व्यक्ति/दिन), 3 दिन का खाना, प्राथमिक चिकित्सा किट, दवाइयां, टॉर्च, बैटरी, रेडियो, सीटी, पहचान दस्तावेज, नकदी, आपातकालीन संपर्क नंबर।'
      : 'Emergency kit essentials: Drinking water (3L/person/day), 3-day food supply, first aid kit, medications, torch, batteries, battery radio, whistle, identity documents, cash, emergency contact numbers. Keep this bag ready to grab in 60 seconds.';
    return res.json({ category: 'kit', message: msg, lang: l });
  }

  if (response) {
    return res.json({ category, response, lang: l });
  }

  const fallback = l === 'hi'
    ? 'मैं बाढ़, भूकंप, चक्रवात, आग, भूस्खलन और लू के बारे में सहायता कर सकता हूं। आपातकालीन नंबर के लिए "contact" टाइप करें। अधिक जानकारी के लिए अपनी समस्या विस्तार से बताएं।'
    : 'I can help with: flood, earthquake, cyclone, fire, landslide, heatwave safety. Type "contacts" for emergency numbers or "kit" for emergency kit checklist. Ask me about any specific disaster situation.';
  res.json({ category: 'unknown', message: fallback, lang: l });
});

module.exports = router;
