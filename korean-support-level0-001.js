/* Korean Level 0 001: six aligned support-language meanings and response prompts.
   AI-reviewed for this release; no native-speaker review is implied. */
(function () {
  'use strict';
  const id = 'ko-guided-a0-001';
  const reviewedAt = '2026-10-25';
  const review = Object.fromEntries(['vi', 'ne', 'km', 'my', 'th', 'ja'].map(code =>
    [code, {status: 'ai-reviewed', reviewedAt}]));
  (window.TalkTagKoreanTranslations ||= Object.create(null))[id] = {
    source: ['안녕하세요.'],
    sourceHash: '8b118d6741f7cfa1a7ee246d0dda39f2f00bf9fd207b4e6c7fad87a15434a513',
    translations: {
      vi: ['Xin chào.'],
      ne: ['नमस्ते।'],
      km: ['សួស្តី។'],
      my: ['မင်္ဂလာပါ။'],
      th: ['สวัสดี'],
      ja: ['こんにちは。']
    },
    review
  };
  (window.TalkTagKoreanLevel0Prompts ||= Object.create(null))[id] = {
    en: 'A café worker smiles and greets you. What do you say?',
    vi: 'Nhân viên quán cà phê mỉm cười chào bạn. Bạn sẽ đáp lại thế nào?',
    ne: 'क्याफेका कर्मचारीले मुस्कुराउँदै तपाईंलाई अभिवादन गर्छन्। तपाईं के भन्नुहुन्छ?',
    km: 'បុគ្គលិកហាងកាហ្វេញញឹម ហើយស្វាគមន៍អ្នក។ តើអ្នកនឹងឆ្លើយថាម៉េច?',
    my: 'ကော်ဖီဆိုင်ဝန်ထမ်းက ပြုံးပြီး သင့်ကို နှုတ်ဆက်ပါတယ်။ သင် ဘာပြန်ပြောမလဲ။',
    th: 'พนักงานร้านกาแฟยิ้มทักทายคุณ คุณจะตอบว่าอะไร?',
    ja: 'カフェの店員が笑顔であいさつしました。あなたは何と言いますか。'
  };
})();
