/* Published Boot Camp episode scenes. */
(() => {
  'use strict';
  const levels = new Set(['A1','A2','B1','B2','C1','C2']);
  const scenes = Object.freeze({
    en: Object.freeze({
      vocal: Object.freeze({src:'/assets/bootcamp-scenes/en/001-v3-vocal.jpg',alt:'A commuter checks the owner of a lost glove at a bus stop'}),
      story: Object.freeze({src:'/assets/bootcamp-scenes/en/001-v3-story.jpg',alt:'A reader gives a folded note to a librarian'})
    }),
    ko: Object.freeze({
      vocal: Object.freeze({src:'/assets/bootcamp-scenes/ko/001-v3-vocal.jpg',alt:'A commuter checks the owner of a lost umbrella at a bus stop'}),
      story: Object.freeze({src:'/assets/bootcamp-scenes/ko/001-v3-story.jpg',alt:'A learner shows a forgotten charger to a teacher'})
    }),
    ja: Object.freeze({
      vocal: Object.freeze({src:'/assets/bootcamp-scenes/ja/001-v3-vocal.jpg',alt:'A learner returns a forgotten notebook to a community-class teacher'}),
      story: Object.freeze({src:'/assets/bootcamp-scenes/ja/001-v3-vocal.jpg',alt:'A notebook rests in a community classroom'})
    })
  });
  window.TalkTagBootCampArtwork = Object.freeze({
    get(camp, number, level, language = 'ko') {
      if (!levels.has(level)) return null;
      if (language === 'en' && number === '003') return {"en-vocal-camp-003-a1":{"src":"/assets/bootcamp-scenes/en/003-a1.jpg","alt":"가방에서 꺼낸 책을 문 닫은 도서관의 반납함에 넣어요."},"en-story-camp-003-a1":{"src":"/assets/bootcamp-scenes/en/003-a1.jpg","alt":"가방에서 꺼낸 책을 문 닫은 도서관의 반납함에 넣어요."},"en-vocal-camp-003-a2":{"src":"/assets/bootcamp-scenes/en/003-a2.jpg","alt":"문 닫은 도서관에서 화살표를 따라 모퉁이의 반납함을 찾아가요."},"en-story-camp-003-a2":{"src":"/assets/bootcamp-scenes/en/003-a2.jpg","alt":"문 닫은 도서관에서 화살표를 따라 모퉁이의 반납함을 찾아가요."},"en-vocal-camp-003-b1":{"src":"/assets/bootcamp-scenes/en/003-b1.jpg","alt":"비가 내리기 시작할 때 가득 찬 반납함과 다른 지점을 안내하는 표지판을 발견해요."},"en-story-camp-003-b1":{"src":"/assets/bootcamp-scenes/en/003-b1.jpg","alt":"비가 내리기 시작할 때 가득 찬 반납함과 다른 지점을 안내하는 표지판을 발견해요."},"en-vocal-camp-003-b2":{"src":"/assets/bootcamp-scenes/en/003-b2.jpg","alt":"책만 반납함에 넣고 케이스에 든 태블릿은 손에 들고 있어요."},"en-story-camp-003-b2":{"src":"/assets/bootcamp-scenes/en/003-b2.jpg","alt":"책만 반납함에 넣고 케이스에 든 태블릿은 손에 들고 있어요."},"en-vocal-camp-003-c1":{"src":"/assets/bootcamp-scenes/en/003-c1.jpg","alt":"문이 잠긴 도서관 앞에서 조기 폐관 안내문을 휴대전화로 찍어요."},"en-story-camp-003-c1":{"src":"/assets/bootcamp-scenes/en/003-c1.jpg","alt":"문이 잠긴 도서관 앞에서 조기 폐관 안내문을 휴대전화로 찍어요."},"en-vocal-camp-003-c2":{"src":"/assets/bootcamp-scenes/en/003-c2.jpg","alt":"도서관 직원에게 문의한 뒤 계정에서 책이 반납 처리된 것을 확인해요."},"en-story-camp-003-c2":{"src":"/assets/bootcamp-scenes/en/003-c2.jpg","alt":"도서관 직원에게 문의한 뒤 계정에서 책이 반납 처리된 것을 확인해요."}}['en-'+camp+'-camp-003-'+level.toLowerCase()] || null;
      if (language === 'en' && number === '002') return {
        vocal: {src:'/assets/bootcamp-scenes/en/002-vocal.jpg',alt:'A group discovers another class in its booked classroom'},
        story: {src:'/assets/bootcamp-scenes/en/002-story.jpg',alt:'A coordinator compares two classroom reservations'}
      }[camp] || null;
      if (language === 'ko' && number === '002' && level === 'C2') return {src:'/assets/bootcamp-scenes/ko/002-c2-v2.jpg',alt:'A customer holding her blue bag explains discomfort with an ownership check while the café worker listens seriously'};
      if (language === 'ko' && number === '002') return {src:'/assets/bootcamp-scenes/ko/002-'+level.toLowerCase()+'.jpg',alt:'Finding and returning a blue bag at a café'};
      if (number !== '001') return null;
      return scenes[language]?.[camp] || null;
    }
  });
})();
