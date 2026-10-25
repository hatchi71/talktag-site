/* Level 0 Korean 002–010: aligned support meanings and tiny response prompts.
   AI-reviewed drafts; native-speaker verification remains pending. */
(function () {
  'use strict';
  const reviewedAt = '2026-10-25';
  const review = () => Object.fromEntries(['vi', 'ne', 'km', 'my', 'th', 'ja'].map(code =>
    [code, {status: 'ai-reviewed', reviewedAt}]));
  const entries = [
    {
      id: 'ko-guided-a0-002', source: '저는 알렉스예요.', sourceHash: 'd988e70b6f8a9701fbd896b5dd2dacf827bc5d6a4d72c3dab36b9c25fc73c485',
      translations: {
        vi: 'Tôi là Alex.', ne: 'म एलेक्स हुँ।', km: 'ខ្ញុំឈ្មោះអាឡិច។',
        my: 'နာမည်က အဲလက်စ်ပါ။', th: 'ฉันชื่ออเล็กซ์', ja: 'アレックスです。'
      },
      prompts: {
        vi: 'Bạn gặp một người mới. Hãy nói tên của mình.',
        ne: 'तपाईं नयाँ व्यक्तिलाई भेट्नुहुन्छ। आफ्नो नाम भन्नुहोस्।',
        km: 'អ្នកជួបមនុស្សថ្មីម្នាក់។ សូមប្រាប់ឈ្មោះរបស់អ្នក។',
        my: 'လူသစ်တစ်ယောက်နဲ့ တွေ့တဲ့အခါ ကိုယ့်နာမည်ကို ပြောပါ။',
        th: 'คุณพบคนใหม่ ลองบอกชื่อของตัวเอง',
        ja: '初めて会った人に、自分の名前を言ってみましょう。'
      }
    },
    {
      id: 'ko-guided-a0-003', source: '감사합니다.', sourceHash: 'e951aae21fa2384a611eed2a1d42748cae6cf497908e3b499a14eab036f868d5',
      translations: {
        vi: 'Cảm ơn ạ.', ne: 'धन्यवाद।', km: 'អរគុណ។',
        my: 'ကျေးဇူးတင်ပါတယ်။', th: 'ขอบคุณ', ja: 'ありがとうございます。'
      },
      prompts: {
        vi: 'Nhân viên đưa nước cho bạn. Hãy cảm ơn họ.',
        ne: 'क्याफेका कर्मचारीले तपाईंलाई पानी दिन्छन्। धन्यवाद भन्नुहोस्।',
        km: 'បុគ្គលិកហាងកាហ្វេឱ្យទឹកអ្នក។ សូមអរគុណគាត់។',
        my: 'ကော်ဖီဆိုင်ဝန်ထမ်းက ရေပေးတဲ့အခါ ကျေးဇူးတင်စကား ပြောပါ။',
        th: 'พนักงานยื่นน้ำให้คุณ ลองกล่าวขอบคุณ',
        ja: '店員が水を渡してくれました。お礼を言いましょう。'
      }
    },
    {
      id: 'ko-guided-a0-004', source: '저기요.', sourceHash: 'f9325076e776e16cf1854f9ac5d34b70ba097ece7e546abd6561106c67b8aaf6',
      translations: {
        vi: 'Cho tôi hỏi một chút ạ.', ne: 'माफ गर्नुहोस्।', km: 'សូមទោស។',
        my: 'တစ်ဆိတ်လောက်ပါ။', th: 'ขอโทษนะ', ja: 'すみません。'
      },
      prompts: {
        vi: 'Bạn muốn gọi nhân viên. Hãy gọi một cách lịch sự.',
        ne: 'तपाईं कर्मचारीलाई बोलाउन चाहनुहुन्छ। विनम्र रूपमा बोलाउनुहोस्।',
        km: 'អ្នកចង់ហៅបុគ្គលិក។ សូមហៅដោយសុភាព។',
        my: 'ဝန်ထမ်းကို လှမ်းခေါ်ချင်ပါတယ်။ ယဉ်ယဉ်ကျေးကျေး ခေါ်ပါ။',
        th: 'คุณต้องการเรียกพนักงาน ลองเรียกอย่างสุภาพ',
        ja: '店員に声をかけたいとき、丁寧に呼んでみましょう。'
      }
    },
    {
      id: 'ko-guided-a0-005', source: '아니요, 괜찮아요.', sourceHash: '4fc129fa8374ae32a412c70fa8c192ad69a17fa33b45ef2b17c8503fb5ac6739',
      translations: {
        vi: 'Không, cảm ơn. Tôi không cần thêm ạ.', ne: 'होइन, धन्यवाद। मलाई पुग्यो।',
        km: 'ទេ អរគុណ។ ខ្ញុំមិនត្រូវការទៀតទេ។', my: 'မလိုတော့ပါဘူး၊ ကျေးဇူးတင်ပါတယ်။',
        th: 'ไม่เป็นไร ขอบคุณ', ja: 'いいえ、大丈夫です。'
      },
      prompts: {
        vi: 'Bạn không muốn thêm đồ uống. Hãy từ chối lịch sự.',
        ne: 'तपाईंलाई थप पेय पदार्थ चाहिँदैन। विनम्र रूपमा अस्वीकार गर्नुहोस्।',
        km: 'អ្នកមិនត្រូវការភេសជ្ជៈបន្ថែមទេ។ សូមបដិសេធដោយសុភាព។',
        my: 'နောက်ထပ်သောက်စရာ မလိုတော့ပါဘူး။ ယဉ်ယဉ်ကျေးကျေး ငြင်းပါ။',
        th: 'คุณไม่ต้องการเครื่องดื่มเพิ่ม ลองปฏิเสธอย่างสุภาพ',
        ja: '飲み物はもう要りません。丁寧に断ってみましょう。'
      }
    },
    {
      id: 'ko-guided-a0-006', source: '물 좀 주세요.', sourceHash: 'eb2b0df7b193e0ce3a38ad6f19ae1ee3d7d7d29dbb4471fbdfc90ba3286582bd',
      translations: {
        vi: 'Cho tôi xin ít nước ạ.', ne: 'कृपया मलाई पानी दिनुहोस्।',
        km: 'សូមទឹកបន្តិច។', my: 'ရေတစ်ခွက်လောက် ပေးပါ။',
        th: 'ขอน้ำหน่อย', ja: 'お水をください。'
      },
      prompts: {
        vi: 'Ly nước của bạn đã hết. Hãy xin thêm nước.',
        ne: 'तपाईंको गिलास खाली छ। पानी माग्नुहोस्।',
        km: 'កែវទឹករបស់អ្នកទទេហើយ។ សូមសុំទឹក។',
        my: 'ရေခွက်လွတ်နေပါတယ်။ ရေတောင်းပါ။',
        th: 'แก้วน้ำของคุณว่างแล้ว ลองขอน้ำ',
        ja: 'コップが空になりました。水を頼んでみましょう。'
      }
    },
    {
      id: 'ko-guided-a0-007', source: '다시 말씀해 주세요.', sourceHash: '77150d812f466cec7eb614960852624ea0f3cc64e3e9a5a24e30c26f5bcfbc5a',
      translations: {
        vi: 'Xin nói lại giúp tôi ạ.', ne: 'कृपया फेरि भन्नुहोस्।',
        km: 'សូមនិយាយម្ដងទៀត។', my: 'ထပ်ပြောပေးပါ။',
        th: 'ช่วยพูดอีกครั้งได้ไหม', ja: 'もう一度言ってください。'
      },
      prompts: {
        vi: 'Bạn nghe không rõ lời nhân viên. Hãy nhờ họ nói lại.',
        ne: 'तपाईंले कर्मचारीको कुरा राम्ररी सुन्नुभएन। फेरि भन्न अनुरोध गर्नुहोस्।',
        km: 'អ្នកស្តាប់បុគ្គលិកមិនច្បាស់។ សូមឱ្យគាត់និយាយម្តងទៀត។',
        my: 'ဝန်ထမ်းပြောတာကို မကြားလိုက်ပါဘူး။ ထပ်ပြောခိုင်းပါ။',
        th: 'คุณฟังพนักงานไม่ชัด ลองขอให้พูดอีกครั้ง',
        ja: '係員の言葉が聞き取れませんでした。もう一度言ってもらいましょう。'
      }
    },
    {
      id: 'ko-guided-a0-008', source: '화장실이 어디예요?', sourceHash: '349abc0ee1a20571cd94b0dc402a0c3d69bf319edf13913af042443dabd7ccbf',
      translations: {
        vi: 'Nhà vệ sinh ở đâu ạ?', ne: 'शौचालय कहाँ छ?',
        km: 'បន្ទប់ទឹកនៅឯណា?', my: 'အိမ်သာ ဘယ်မှာလဲ။',
        th: 'ห้องน้ำอยู่ที่ไหน', ja: 'トイレはどこですか。'
      },
      prompts: {
        vi: 'Bạn không thấy nhà vệ sinh. Hãy hỏi nhân viên ở đâu.',
        ne: 'तपाईंले शौचालय फेला पार्नुभएन। कर्मचारीलाई कहाँ छ भनेर सोध्नुहोस्।',
        km: 'អ្នករកបន្ទប់ទឹកមិនឃើញទេ។ សូមសួរបុគ្គលិកថាវានៅឯណា។',
        my: 'အိမ်သာကို ရှာမတွေ့ပါဘူး။ ဝန်ထမ်းကို ဘယ်မှာလဲလို့ မေးပါ။',
        th: 'คุณหาห้องน้ำไม่เจอ ลองถามพนักงานว่าอยู่ที่ไหน',
        ja: 'トイレが見つかりません。係員に場所を聞いてみましょう。'
      }
    },
    {
      id: 'ko-guided-a0-009', source: '저 좀 도와주세요.', sourceHash: 'f0b3e05b805981e27e8d43e931eb6ba0dac212b010ba49bb5f4abc7ad878e357',
      translations: {
        vi: 'Làm ơn giúp tôi với ạ.', ne: 'कृपया मलाई मद्दत गर्नुहोस्।',
        km: 'សូមជួយខ្ញុំផង។', my: 'ကူညီပေးပါဦး။',
        th: 'ช่วยหน่อยได้ไหม', ja: 'ちょっと手伝ってください。'
      },
      prompts: {
        vi: 'Va-li quá nặng. Hãy nhờ người bên cạnh giúp.',
        ne: 'सुटकेस धेरै भारी छ। नजिकको व्यक्तिसँग मद्दत माग्नुहोस्।',
        km: 'វ៉ាលីធ្ងន់ពេក។ សូមសុំឱ្យអ្នកនៅក្បែរជួយ។',
        my: 'ခရီးဆောင်အိတ်က လေးနေပါတယ်။ အနားကလူကို အကူအညီတောင်းပါ။',
        th: 'กระเป๋าเดินทางหนักมาก ลองขอให้คนข้าง ๆ ช่วย',
        ja: 'スーツケースが重くて持てません。近くの人に助けを頼みましょう。'
      }
    },
    {
      id: 'ko-guided-a0-010', source: '안녕히 계세요.', sourceHash: 'b648428e6df1bd5dd38830100dd9940484605cbfffca14d68c98d2bc6cd85417',
      translations: {
        vi: 'Tạm biệt ạ. (Nói với người ở lại.)', ne: 'बिदा हुन्छु। (अर्को व्यक्ति त्यहीँ रहन्छ।)',
        km: 'លាសិនហើយ។ (និយាយទៅកាន់អ្នកដែលនៅទីនោះ។)',
        my: 'သွားပါဦးမယ်။ (တစ်ဖက်လူက နေခဲ့မယ်။)',
        th: 'ขอตัวก่อนนะ (พูดกับคนที่ยังอยู่)',
        ja: '失礼します。（相手がその場に残るとき）'
      },
      prompts: {
        vi: 'Bạn rời cửa hàng, còn nhân viên ở lại. Hãy chào tạm biệt.',
        ne: 'तपाईं पसलबाट निस्कँदै हुनुहुन्छ; कर्मचारी त्यहीँ रहन्छन्। बिदा भन्नुहोस्।',
        km: 'អ្នកចេញពីហាង ហើយបុគ្គលិកនៅទីនោះ។ សូមនិយាយលា។',
        my: 'သင် ဆိုင်ကထွက်သွားပြီး ဝန်ထမ်းက ဆိုင်မှာနေခဲ့မယ်။ နှုတ်ဆက်ပါ။',
        th: 'คุณกำลังออกจากร้าน ส่วนพนักงานยังอยู่ ลองกล่าวลา',
        ja: 'あなたは店を出て、店員は残ります。別れのあいさつをしましょう。'
      }
    }
  ];
  const defaultPrompts = {
    'ko-guided-a0-002': 'You meet someone new. Say your own name instead of Alex.',
    'ko-guided-a0-003': 'A café worker gives you a glass of water. Thank them.',
    'ko-guided-a0-004': "You want to get a café worker's attention. What do you say?",
    'ko-guided-a0-005': "Someone offers you another drink, but you don't need one. Reply politely.",
    'ko-guided-a0-006': 'Your glass is empty. Ask a café worker for water.',
    'ko-guided-a0-007': 'You missed what the station clerk said. Ask them to repeat it.',
    'ko-guided-a0-008': 'You cannot find the restroom at a station. Ask a staff member.',
    'ko-guided-a0-009': 'Your suitcase is too heavy to lift alone. Ask a nearby person for help.',
    'ko-guided-a0-010': 'You leave a shop while the clerk stays inside. What do you say?'
  };
  const registry = (window.TalkTagKoreanTranslations ||= Object.create(null));
  const prompts = (window.TalkTagKoreanLevel0Prompts ||= Object.create(null));
  for (const entry of entries) {
    registry[entry.id] = {source: [entry.source], sourceHash: entry.sourceHash, translations: Object.fromEntries(
      Object.entries(entry.translations).map(([code, value]) => [code, [value]])), review: review()};
    prompts[entry.id] = {en: defaultPrompts[entry.id], ...entry.prompts};
  }
})();
